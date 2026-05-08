/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-vkontakte';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VkStrategy extends PassportStrategy(Strategy, 'vk') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.getOrThrow('VK_CLIENT_ID'),
      clientSecret: configService.getOrThrow('VK_CLIENT_SECRET'),
      callbackURL:
        configService.getOrThrow('SERVER_URL') + '/api/auth/vk/callback',
      scope: ['email'],
    } as any);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    params: any,
    profile: any,
    done: Function,
  ) {
    const user = {
      email: params.email,
      name: profile.displayName,
      picture: profile.photos?.[0]?.value,
    };

    done(null, user);
  }
}
