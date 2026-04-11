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
import * as nodemailer from 'nodemailer';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthService {
  EXPIRE_DAY_REFRESH_TOKEN = 1;
  REFRESH_TOKEN_NAME = 'refreshToken';
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly jwt: JwtService,
    private readonly UserService: UserService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: Number(this.configService.get('SMTP_PORT')),
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
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

    const accessToken = this.jwt.sign(data, { expiresIn: '1h' });
    const refreshToken = this.jwt.sign(data, { expiresIn: '7d' });

    return { accessToken, refreshToken };
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

  async sendCode(email: string) {
    const user = await this.UserService.getByEmail(email);
    if (!user) {
      throw new NotFoundException(
        'Пользователь с таким email не найден. Войдите через VK или Google.',
      );
    }

    await this.prisma.emailCode.deleteMany({ where: { email } });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.emailCode.create({
      data: { email, code, expiresAt },
    });

    await this.transporter.sendMail({
      from: `"ZANESHOP" <${this.configService.get('SMTP_USER')}>`,
      to: email,
      subject: 'Код для входа в ZANESHOP',
      html: `
                <div style="font-family: sans-serif; max-width: 400px; margin: auto; padding: 32px;">
                    <h2 style="color: #fff; background: #1c1d1f; padding: 20px; border-radius: 12px; text-align: center;">
                        Ваш код для входа
                    </h2>
                    <div style="font-size: 40px; font-weight: bold; letter-spacing: 10px;
                        background: #1c1d1f; color: #fff; padding: 24px;
                        border-radius: 12px; text-align: center; margin-top: 12px;">
                        ${code}
                    </div>
                    <p style="color: #888; margin-top: 16px; text-align: center;">
                        Код действителен 10 минут. Не передавайте его никому.
                    </p>
                </div>
            `,
    });

    return { success: true };
  }

  async verifyCode(email: string, code: string, res: Response) {
    const record = await this.prisma.emailCode.findFirst({
      where: { email, code },
    });

    if (!record) throw new BadRequestException('Неверный код');

    if (record.expiresAt < new Date()) {
      await this.prisma.emailCode.delete({ where: { id: record.id } });
      throw new BadRequestException('Код истёк, запросите новый');
    }

    await this.prisma.emailCode.delete({ where: { id: record.id } });

    const user = await this.UserService.getByEmail(email);
    if (!user) throw new NotFoundException('Пользователь не найден');

    const tokens = this.issueTokens(user.id, String(user.role));
    this.addRefreshTokenToResponse(res, tokens.refreshToken);

    return { user, accessToken: tokens.accessToken };
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
