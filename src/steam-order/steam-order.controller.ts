import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { SteamOrderService } from './steam-order.service';
import { SteamCheckDto, SteamOrderDto } from './dto/steam-order.dto';
import { OptionalJwtGuard } from 'src/auth/guards/optional-jwt.guard';

@Controller('steam-orders')
export class SteamOrderController {
  constructor(private readonly steamOrderService: SteamOrderService) {}

  @Post('check')
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ transform: true }))
  async checkPost(@Body() dto: SteamCheckDto) {
    return this.steamOrderService.checkAccount(dto);
  }

  @Get('check')
  @UsePipes(new ValidationPipe({ transform: true }))
  async checkGet(@Query() dto: SteamCheckDto) {
    return this.steamOrderService.checkAccount(dto);
  }

  @Post('place')
  @UseGuards(OptionalJwtGuard)
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ transform: true }))
  async place(@Body() dto: SteamOrderDto, @Req() req: Request) {
    const userId = (req as any).user?.id ?? null;
    return this.steamOrderService.createPayment(dto, userId);
  }
}
