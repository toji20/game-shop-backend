import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SteamOrderService } from './steam-order.service';
import { SteamOrderDto } from './dto/steam-order.dto';
import { Auth } from 'src/auth/decorators/authorization.decorator';
import { CurrentUser } from 'src/user/decorators/user.decorator';

@Controller('steam-orders')
export class SteamOrderController {
  constructor(private readonly steamOrderService: SteamOrderService) {}

  @Get('check')
  @Auth()
  @UsePipes(new ValidationPipe({ transform: true }))
  async check(@Query() dto: SteamOrderDto) {
    return this.steamOrderService.checkAccount(dto);
  }

  @Post('place')
  @Auth()
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ transform: true }))
  async place(
    @Body() dto: SteamOrderDto & { customId: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.steamOrderService.createPayment(dto, userId);
  }
}
