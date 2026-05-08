import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const passport = require('passport');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Strategy } = require('passport-custom');

@Injectable()
export class VkStrategy {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly callbackURL: string;

  constructor(private configService: ConfigService) {
    this.clientId = configService.getOrThrow('VK_CLIENT_ID');
    this.clientSecret = configService.getOrThrow('VK_CLIENT_SECRET');
    this.callbackURL =
      configService.getOrThrow('SERVER_URL') + '/api/auth/vk/callback';

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    passport.use(
      'vk',
      new Strategy(async (req: any, done: any) => {
        try {
          const code = req.query.code as string;
          const deviceId = req.query.device_id as string;
          const state = req.query.state as string;

          if (!code) return done(new Error('No code'));

          const tokenRes = await axios.post(
            'https://id.vk.com/oauth2/auth',
            new URLSearchParams({
              grant_type: 'authorization_code',
              code,
              client_id: this.clientId,
              client_secret: this.clientSecret,
              redirect_uri: this.callbackURL,
              device_id: deviceId || '',
              state: state || '',
            }).toString(),
            {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            },
          );

          const { access_token } = tokenRes.data;

          const userRes = await axios.post(
            'https://id.vk.com/oauth2/user_info',
            new URLSearchParams({
              client_id: this.clientId,
              access_token,
            }).toString(),
            {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            },
          );

          const u = userRes.data.user;

          done(null, {
            email: u.email,
            name: `${u.first_name} ${u.last_name}`,
            picture: u.avatar,
          });
        } catch (e) {
          done(e);
        }
      }),
    );
  }
}
