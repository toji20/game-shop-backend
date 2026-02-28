/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from 'src/user/dto/auth.dto';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthService {
  EXPIRE_DAY_REFRESH_TOKEN = 1;
  REFRESH_TOKEN_NAME = 'refreshToken';
  constructor(
    private readonly jwt: JwtService,
    private readonly UserService: UserService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: AuthDto) {
    const user = await this.validateUser(dto);
    const tokens = this.issueTokens(user.id, String(user.role));

    return { user, ...tokens };
  }

  async register(dto: AuthDto) {
    const oldUser = await this.UserService.getByEmail(dto.email);

    if (oldUser)
      throw new BadRequestException('Такой пользователь уже существует');

    const user = await this.UserService.create(dto);
    const tokens = this.issueTokens(user.id, String(user.role));

    return { user, ...tokens };
  }

  async getNewTokens(refreshToken: string) {
    const result = await this.jwt.verifyAsync(refreshToken);
    if (!result) throw new UnauthorizedException('Невалидный рефреш токен');

    const user = await this.UserService.getById(result.id);
    const tokens = this.issueTokens(user.id, String(user.role));

    return { user, ...tokens };
  }

  issueTokens(userId: string, role: string) {
    const data = { id: userId, role };

    const accessToken = this.jwt.sign(data, {
      expiresIn: '1h',
    });

    const refreshToken = this.jwt.sign(data, {
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }
  private async validateUser(dto: AuthDto) {
    const user = await this.UserService.getByEmail(dto.email);

    if (!user) throw new NotFoundException('Пользователь не найден');

    return user;
  }

  async validateOAuthLogin(req: any) {
    let user = await this.UserService.getByEmail(req.user.email);

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: req.user.email,
          name: req.user.name,
          picture: req.user.picture,
          role: req.user.role,
        },
        include: {
          favorites: true,
          orders: true,
        },
      });
    }

    const tokens = this.issueTokens(user.id, String(user.role));

    return { user, ...tokens };
  }

  addRefreshTokenToResponse(res: Response, refreshToken: string) {
    const expiresIn = new Date();
    expiresIn.setDate(expiresIn.getDate() + this.EXPIRE_DAY_REFRESH_TOKEN);

    res.cookie(this.REFRESH_TOKEN_NAME, refreshToken, {
      httpOnly: true,
      expires: expiresIn,
      secure: false,
      sameSite: 'lax',
    });
  }

  removeRefreshTokenFromResponse(res: Response) {
    res.cookie(this.REFRESH_TOKEN_NAME, '', {
      httpOnly: true,
      expires: new Date(0),
      secure: false,
      sameSite: 'lax',
    });
  }
}
