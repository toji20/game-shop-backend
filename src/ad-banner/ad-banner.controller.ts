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
import { AdBannerService } from './ad-banner.service';
import { AdBannerDto } from './dto/ad-banner.dto';
import { Auth } from 'src/auth/decorators/authorization.decorator';
import { CheckRole } from 'src/auth/decorators/check-role.decorator';
import { Role } from '@prisma/client';

@Controller('ad-banner')
export class AdBannerController {
  constructor(private readonly AdbannerService: AdBannerService) {}
  @Get()
  async getAll() {
    return this.AdbannerService.getAll();
  }

  @Get('active')
  async getAllActive() {
    return this.AdbannerService.getAllActive();
  }

  @Get('by-id/:id')
  async getById(@Param('id') id: number) {
    return this.AdbannerService.getById(id);
  }

  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER)
  @UsePipes(new ValidationPipe())
  @HttpCode(200)
  @Post()
  async create(@Body() dto: AdBannerDto) {
    return this.AdbannerService.create(dto);
  }

  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER)
  @UsePipes(new ValidationPipe())
  @HttpCode(200)
  @Put(':id')
  async update(@Param('id') id: number, @Body() dto: AdBannerDto) {
    return this.AdbannerService.update(dto, id);
  }

  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER)
  @HttpCode(200)
  @Delete(':id')
  async delete(@Param('id') id: number) {
    return this.AdbannerService.delete(id);
  }
}
