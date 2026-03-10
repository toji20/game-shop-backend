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
import { GameService } from './game.service';
import { GameDto } from './dto/game.dto';
import { CheckRole } from 'src/auth/decorators/check-role.decorator';
import { Role } from '@prisma/client';
import { Auth } from 'src/auth/decorators/authorization.decorator';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get('')
  async getAll() {
    return this.gameService.getAll();
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
