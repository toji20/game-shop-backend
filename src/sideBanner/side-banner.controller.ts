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
import { SideBannerService } from './side-banner.service';
import { SideBannerDto } from './dto/side-banner.dto';
import { Auth } from 'src/auth/decorators/authorization.decorator';
import { CheckRole } from 'src/auth/decorators/check-role.decorator';
import { Role } from '@prisma/client';

@Controller('sideBanner')
export class SideBannerController {
  constructor(private readonly sideBannerService: SideBannerService) {}
  @Get()
  async getAll() {
    return this.sideBannerService.getAll();
  }

  @Get('by-id/:id')
  async getById(@Param('id') id: number) {
    return this.sideBannerService.getById(id);
  }

  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER)
  @UsePipes(new ValidationPipe())
  @HttpCode(200)
  @Post()
  async create(@Body() dto: SideBannerDto) {
    return this.sideBannerService.create(dto);
  }

  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER)
  @UsePipes(new ValidationPipe())
  @HttpCode(200)
  @Put(':id')
  async update(@Param('id') id: number, @Body() dto: SideBannerDto) {
    return this.sideBannerService.update(dto, id);
  }

  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER)
  @HttpCode(200)
  @Delete(':id')
  async delete(@Param('id') id: number) {
    return this.sideBannerService.delete(id);
  }
}
