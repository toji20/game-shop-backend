/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto } from 'src/user/dto/auth.dto';
import e, { type Request, type Response } from 'express';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // @UsePipes(new ValidationPipe())
  // @HttpCode(200)
  // @Post('login')
  // async login(@Body() dto: AuthDto, @Res({ passthrough: true }) res: Response) {
  //   const { refreshToken, ...response } = await this.authService.login(dto);

  //   this.authService.addRefreshTokenToResponse(res, refreshToken);

  //   return response;
  // }

  // @UsePipes(new ValidationPipe())
  // @HttpCode(200)
  // @Post('register')
  // async register(
  //   @Body() dto: AuthDto,
  //   @Res({ passthrough: true }) res: Response,
  // ) {
  //   const { refreshToken, ...response } = await this.authService.register(dto);

  //   this.authService.addRefreshTokenToResponse(res, refreshToken);

  //   return response;
  // }

  @UsePipes(new ValidationPipe())
  @HttpCode(200)
  @Post('login/access-token')
  async getNewTokens(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshTokenFromCookies =
      req.cookies[this.authService.REFRESH_TOKEN_NAME];

    if (!refreshTokenFromCookies) {
      this.authService.removeRefreshTokenFromResponse(res);
      throw new UnauthorizedException('RefreshToken не прошел');
    }

    const { refreshToken, ...response } = await this.authService.getNewTokens(
      refreshTokenFromCookies,
    );

    this.authService.addRefreshTokenToResponse(res, refreshToken);

    return response;
  }

  @HttpCode(200)
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    this.authService.removeRefreshTokenFromResponse(res);
    return true;
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() _req) {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refreshToken, ...response } =
      await this.authService.validateOAuthLogin(req);

    this.authService.addRefreshTokenToResponse(res, refreshToken);

    return res.redirect(`${process.env['CLIENT_URL']}/profile`);
  }

  @Get('yandex/callback')
  @UseGuards(AuthGuard('yandex'))
  async yandexAuthCallback(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refreshToken, ...response } =
      await this.authService.validateOAuthLogin(req);

    this.authService.addRefreshTokenToResponse(res, refreshToken);

    return res.redirect(`${process.env['CLIENT_URL']}/profile`);
  }

  @Get('yandex')
  @UseGuards(AuthGuard('yandex'))
  async yandexAuth(@Req() _req) {}

  @Get('vk')
  @UseGuards(AuthGuard('vk'))
  async vkAuth() {}

  @Get('vk/callback')
  @UseGuards(AuthGuard('vk'))
  async vkCallback(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const { refreshToken, ...response } =
      await this.authService.validateOAuthLogin(req);

    this.authService.addRefreshTokenToResponse(res, refreshToken);

    return res.redirect(`${process.env['CLIENT_URL']}/profile`);
  }
  @Post('send-code')
  @HttpCode(200)
  async sendCode(@Body('email') email: string) {
    return this.authService.sendCode(email);
  }

  @Post('verify-code')
  @HttpCode(200)
  async verifyCode(
    @Body('email') email: string,
    @Body('code') code: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.verifyCode(email, code, res);
  }
}
