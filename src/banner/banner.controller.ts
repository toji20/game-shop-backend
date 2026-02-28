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
import { BannerService } from './banner.service';
import { BannerDto } from './dto/banner.dto';
import { Auth } from 'src/auth/decorators/authorization.decorator';
import { CheckRole } from 'src/auth/decorators/check-role.decorator';
import { Role } from '@prisma/client';

@Controller('banner')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}
  @Get('by-id/:id')
  async getById(@Param('id') id: number) {
    return this.bannerService.getById(id);
  }

  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER)
  @UsePipes(new ValidationPipe())
  @HttpCode(200)
  @Post()
  async create(@Body() dto: BannerDto) {
    return this.bannerService.create(dto);
  }

  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER)
  @UsePipes(new ValidationPipe())
  @HttpCode(200)
  @Put(':id')
  async update(@Param('id') id: number, @Body() dto: BannerDto) {
    return this.bannerService.update(dto, id);
  }

  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER)
  @HttpCode(200)
  @Delete(':id')
  async delete(@Param('id') id: number) {
    return this.bannerService.delete(id);
  }
}
