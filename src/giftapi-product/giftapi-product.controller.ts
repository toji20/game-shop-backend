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
import { Auth } from 'src/auth/decorators/authorization.decorator';
import { CheckRole } from 'src/auth/decorators/check-role.decorator';
import { Role } from '@prisma/client';
import { GiftapiProductService } from './giftapi-product.sevice';
import {
  CreateGiftApiProductDto,
  UpdateGiftApiProductDto,
} from './dto/giftapi-product.dto';

@Controller('giftapi/products')
export class GiftapiProductController {
  constructor(private readonly giftapiProductService: GiftapiProductService) {}

  @Get()
  async getAll() {
    return this.giftapiProductService.getAll();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.giftapiProductService.getById(id);
  }

  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER)
  @UsePipes(new ValidationPipe())
  @Post()
  @HttpCode(200)
  async create(@Body() dto: CreateGiftApiProductDto) {
    return this.giftapiProductService.create(dto);
  }

  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER)
  @UsePipes(new ValidationPipe())
  @Put(':id')
  @HttpCode(200)
  async update(@Param('id') id: string, @Body() dto: UpdateGiftApiProductDto) {
    return this.giftapiProductService.update(id, dto);
  }

  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER)
  @Delete(':id')
  @HttpCode(200)
  async delete(@Param('id') id: string) {
    return this.giftapiProductService.delete(id);
  }
}
