import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-yandex';

@Injectable()
export class Yandextrategy extends PassportStrategy(Strategy, 'yandex') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.getOrThrow('YANDEX_CLIENT_ID'),
      clientSecret: configService.getOrThrow('YANDEX_CLIENT_SECRET'),
      callbackURL:
        configService.getOrThrow('SERVER_URL') + '/api/auth/yandex/callback',
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: any,
  ) {
    const { username, emails, photos } = profile;
    const user = {
      email: emails![0].value,
      name: username,
      picture: photos![0].value,
    };

    done(null, user);
  }
}
