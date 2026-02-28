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
import { CategoryService } from './category.service';
import { CategoryDto } from './dto/category.dto';
import { CheckRole } from 'src/auth/decorators/check-role.decorator';
import { Auth } from 'src/auth/decorators/authorization.decorator';
import { Role } from '@prisma/client';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  async getAll() {
    return this.categoryService.getAll();
  }

  @Get('by-id/:id')
  async getById(@Param('id') id: string) {
    return this.categoryService.getById(id);
  }

  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER)
  @UsePipes(new ValidationPipe())
  @HttpCode(200)
  @Post()
  async create(@Body() dto: CategoryDto) {
    return this.categoryService.create(dto);
  }

  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER)
  @UsePipes(new ValidationPipe())
  @HttpCode(200)
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: CategoryDto) {
    return this.categoryService.update(dto, id);
  }

  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER)
  @HttpCode(200)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.categoryService.delete(id);
  }
}
