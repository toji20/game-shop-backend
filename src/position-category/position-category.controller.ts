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
import { PositionCategoryService } from './position-category.service';
import { CheckRole } from 'src/auth/decorators/check-role.decorator';
import { Auth } from 'src/auth/decorators/authorization.decorator';
import {
  PositionCategoryDto,
  PositionCategoryUpdateDto,
} from './dto/position-category.dto';

@Controller('position-category')
export class PositionCategoryController {
  constructor(
    private readonly positionCategoryService: PositionCategoryService,
  ) {}

  @Get()
  async getAll() {
    return this.positionCategoryService.getAll();
  }

  @Get('by-game/:gameId')
  async getByGameId(@Param('gameId') gameId: number) {
    return this.positionCategoryService.getByGameId(gameId);
  }

  @Auth()
  @CheckRole('ADMIN', 'MANAGER')
  @UsePipes(new ValidationPipe())
  @HttpCode(200)
  @Post()
  async create(@Body() dto: PositionCategoryDto) {
    return this.positionCategoryService.create(dto);
  }

  @Auth()
  @CheckRole('ADMIN', 'MANAGER')
  @UsePipes(new ValidationPipe())
  @HttpCode(200)
  @Put(':id')
  async update(
    @Param('id') id: number,
    @Body() dto: PositionCategoryUpdateDto,
  ) {
    return this.positionCategoryService.update(dto, id);
  }

  @Auth()
  @CheckRole('ADMIN', 'MANAGER')
  @HttpCode(200)
  @Delete(':id')
  async delete(@Param('id') id: number) {
    return this.positionCategoryService.delete(id);
  }
}
