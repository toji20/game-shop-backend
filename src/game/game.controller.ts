import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { GameService } from './game.service';
import { GameDto } from './dto/game.dto';
import { CheckRole } from 'src/auth/decorators/check-role.decorator';
import { Role } from '@prisma/client';
import { Auth } from 'src/auth/decorators/authorization.decorator';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get()
  async getAll() {
    return this.gameService.getAll();
  }

  @Get('active')
  async getAllActive() {
    return this.gameService.getAllActive();
  }

  @Get('popular')
  async getPopular(@Query('limit') limit?: string) {
    return this.gameService.getPopular(limit ? Number(limit) : 10);
  }

  @Get(':slug')
  async getBySlug(@Param('slug') slug: string) {
    return this.gameService.getBySlug(slug);
  }

  @Get(':id')
  async getById(@Param('id') id: number) {
    return this.gameService.getById(id);
  }

  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER)
  @UsePipes(new ValidationPipe())
  @HttpCode(200)
  @Post()
  async create(@Body() dto: GameDto) {
    return this.gameService.create(dto);
  }

  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER)
  @UsePipes(new ValidationPipe())
  @HttpCode(200)
  @Put(':id')
  async update(@Param('id') id: number, @Body() dto: GameDto) {
    return this.gameService.update(id, dto);
  }

  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER)
  @HttpCode(200)
  @Delete(':id')
  async delete(@Param('id') id: number) {
    return this.gameService.delete(id);
  }
}
