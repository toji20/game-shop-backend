import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { OrderApiService } from './order-api.service';
import { Auth } from 'src/auth/decorators/authorization.decorator';
import { CheckRole } from 'src/auth/decorators/check-role.decorator';
import { Role } from '@prisma/client';
import { OrderUpdateStatus } from './dto/order-update-status.dto';

@Controller('order-api')
export class OrderApiController {
  constructor(private readonly orderApiService: OrderApiService) {}
  @Get()
  async getAll() {
    return this.orderApiService.getAll();
  }

  @Get('by-id/:id')
  async getById(@Param('id') id: string) {
    return this.orderApiService.getById(id);
  }

  @Get('by-id-steam/:id')
  async getByIdSteamOrder(@Param('id') id: string) {
    return this.orderApiService.getByIdSteamOrder(id);
  }
  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @UsePipes(new ValidationPipe())
  @HttpCode(200)
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: OrderUpdateStatus) {
    return this.orderApiService.updateStatus(id, dto);
  }

  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER)
  @HttpCode(200)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.orderApiService.delete(id);
  }
}
