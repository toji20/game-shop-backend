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
import { AvatarService } from './avatar.service';
import { AvatarDto } from './dto/avatar.dto';
import { Auth } from 'src/auth/decorators/authorization.decorator';
import { CheckRole } from 'src/auth/decorators/check-role.decorator';
import { Role } from '@prisma/client';

@Controller('avatar')
export class AvatarController {
  constructor(private readonly avatarService: AvatarService) {}

  @Get()
  async getAll() {
    return this.avatarService.getAll();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.avatarService.getById(id);
  }

  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER)
  @UsePipes(new ValidationPipe())
  @HttpCode(200)
  @Post()
  async create(@Body() dto: AvatarDto) {
    return this.avatarService.create(dto);
  }

  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER)
  @UsePipes(new ValidationPipe())
  @HttpCode(200)
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: AvatarDto) {
    return this.avatarService.update(id, dto);
  }

  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER)
  @HttpCode(200)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.avatarService.delete(id);
  }
}
