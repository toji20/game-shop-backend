import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ManualStatus } from '@prisma/client';
import { ManualOrderService } from './manual-order.service';
import { Provide2FADto, UpdateManualStatusDto } from './dto/manual-order.dto';
import { Auth } from 'src/auth/decorators/authorization.decorator';
import { CurrentUser } from 'src/user/decorators/user.decorator';
import { Role } from '@prisma/client';

@Controller('manual-orders')
export class ManualOrderController {
  constructor(private readonly manualOrderService: ManualOrderService) {}

  @Get()
  @Auth(Role.MANAGER, Role.OPERATOR, Role.ADMIN)
  async getAll(@Query('status') status?: ManualStatus) {
    return this.manualOrderService.getAll(status);
  }
  @Get(':id')
  @Auth(Role.MANAGER, Role.OPERATOR, Role.ADMIN)
  async getById(@Param('id') id: string) {
    return this.manualOrderService.getById(id);
  }

  @Patch(':id/status')
  @Auth(Role.MANAGER, Role.OPERATOR, Role.ADMIN)
  @UsePipes(new ValidationPipe())
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateManualStatusDto,
  ) {
    return this.manualOrderService.updateStatus(id, dto);
  }

  @Post(':id/request-2fa')
  @HttpCode(200)
  @Auth(Role.MANAGER, Role.OPERATOR, Role.ADMIN)
  async request2FA(@Param('id') id: string) {
    return this.manualOrderService.request2FA(id);
  }

  @Post(':id/provide-2fa')
  @HttpCode(200)
  @Auth()
  @UsePipes(new ValidationPipe())
  async provide2FA(
    @Param('id') id: string,
    @Body() dto: Provide2FADto,
    @CurrentUser('id') userId: string,
  ) {
    return this.manualOrderService.provide2FA(id, dto.code, userId);
  }
}
