/* eslint-disable @typescript-eslint/no-misused-promises */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as passport from 'passport';
import { Strategy } from 'passport-custom';

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

    passport.use(
      'vk',
      new Strategy(async (req: any, done: any) => {
        try {
          const code = req.query.code as string;
          const state = req.query.state as string;
          const deviceId = req.query.device_id as string;

          if (!code) return done(new Error('No code provided'));

          const tokenResponse = await axios.post(
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

          const { access_token } = tokenResponse.data;

          const userResponse = await axios.post(
            'https://id.vk.com/oauth2/user_info',
            new URLSearchParams({
              client_id: this.clientId,
              access_token,
            }).toString(),
            {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            },
          );

          const vkUser = userResponse.data.user;

          done(null, {
            email: vkUser.email,
            name: `${vkUser.first_name} ${vkUser.last_name}`,
            picture: vkUser.avatar,
          });
        } catch (error) {
          done(error);
        }
      }),
    );
  }
}
