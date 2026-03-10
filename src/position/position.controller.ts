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
import { PositionService } from './position.service';
import { PositionDto, PositionUpdateDto } from './dto/position.dto';
import { CheckRole } from 'src/auth/decorators/check-role.decorator';
import { Auth } from 'src/auth/decorators/authorization.decorator';

@Controller('position')
export class PositionController {
  constructor(private readonly positionService: PositionService) {}

  @Get('by-game/:gameId')
  async getBygameId(@Param('gameId') gameId: number) {
    return this.positionService.getByGameId(gameId);
  }

  @Auth()
  @CheckRole('ADMIN', 'MANAGER')
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(200)
  @Post()
  async create(@Body() dto: PositionDto) {
    return this.positionService.create(dto);
  }

  @Auth()
  @CheckRole('ADMIN', 'MANAGER')
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(200)
  @Put(':id')
  async update(@Param('id') id: number, @Body() dto: PositionUpdateDto) {
    return this.positionService.update(id, dto);
  }

  @Auth()
  @CheckRole('ADMIN', 'MANAGER')
  @HttpCode(200)
  @Delete(':id')
  async delete(@Param('id') id: number) {
    return this.positionService.delete(id);
  }
}
