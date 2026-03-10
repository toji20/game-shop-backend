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
import { GameFieldService } from './game-field.service';
import { CheckRole } from 'src/auth/decorators/check-role.decorator';
import { GameFieldDto, GameFieldUpdateDto } from './dto/game-field.dto';
import { Auth } from 'src/auth/decorators/authorization.decorator';

@Controller('game-field')
export class GameFieldController {
  constructor(private readonly gameFieldService: GameFieldService) {}

  @Get('by-game/:gameId')
  async getBygameId(@Param('gameId') gameId: number) {
    return this.gameFieldService.getByGameId(gameId);
  }

  @Auth()
  @CheckRole('ADMIN', 'MANAGER')
  @UsePipes(new ValidationPipe())
  @HttpCode(200)
  @Post()
  async create(@Body() dto: GameFieldDto) {
    return this.gameFieldService.create(dto);
  }

  @Auth()
  @CheckRole('ADMIN', 'MANAGER')
  @UsePipes(new ValidationPipe())
  @HttpCode(200)
  @Put(':id')
  async update(@Param('id') id: number, @Body() dto: GameFieldUpdateDto) {
    return this.gameFieldService.update(dto, id);
  }

  @Auth()
  @CheckRole('ADMIN', 'MANAGER')
  @HttpCode(200)
  @Delete(':id')
  async delete(@Param('id') id: number) {
    return this.gameFieldService.delete(id);
  }
}
