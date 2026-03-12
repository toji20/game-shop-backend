import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PromoService } from './promo.service';
import {
  ApplyPromoCodeDto,
  PromoCodeCreateDto,
  PromoCodeUpdateDto,
} from './dto/promo.dto';
import { Auth } from 'src/auth/decorators/authorization.decorator';
import { CheckRole } from 'src/auth/decorators/check-role.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from 'src/user/decorators/user.decorator';

@Controller('promo')
export class PromoController {
  constructor(private readonly promoService: PromoService) {}

  // ── Только для админа/менеджера ───────────────────────────────────────────

  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER)
  @Get()
  async getAll() {
    return this.promoService.getAll();
  }

  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER)
  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.promoService.getById(id);
  }

  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER)
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(200)
  @Post()
  async create(@Body() dto: PromoCodeCreateDto) {
    return this.promoService.create(dto);
  }

  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER)
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(200)
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: PromoCodeUpdateDto) {
    return this.promoService.update(id, dto);
  }

  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER)
  @HttpCode(200)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.promoService.delete(id);
  }

  // ── Для авторизованных пользователей ──────────────────────────────────────

  // Проверить промокод перед оформлением заказа
  @Auth()
  @UsePipes(new ValidationPipe())
  @HttpCode(200)
  @Post('apply')
  async apply(
    @Body() dto: ApplyPromoCodeDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.promoService.apply(dto, userId);
  }
}
