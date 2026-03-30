import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { OrderService } from './order.service';
import { OrderDto } from './dto/order.dto';
import { PaymentStatusDto } from './dto/payment-status.dto';
import { OptionalJwtGuard } from 'src/auth/guards/optional-jwt.guard';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @UseGuards(OptionalJwtGuard)
  @UsePipes(new ValidationPipe())
  @HttpCode(200)
  @Post('place')
  async checkout(@Body() dto: OrderDto, @Req() req: Request) {
    const userId = (req as any).user?.id ?? null;
    return this.orderService.createPayment(dto, userId);
  }

  @HttpCode(200)
  @Post('status')
  async updateStatus(@Body() dto: PaymentStatusDto) {
    return this.orderService.updateStatus(dto);
  }
}
