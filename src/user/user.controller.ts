import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { AuthDto, UpdateUserRoleDto } from './dto/auth.dto';
import { CurrentUser } from './decorators/user.decorator';
import { Role } from '@prisma/client';
import { Auth } from 'src/auth/decorators/authorization.decorator';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('id/:id')
  async getById(@Param('id') id: string) {
    return await this.userService.getById(id);
  }

  @Get('email/:email')
  async getByEmail(@Param('email') email: string) {
    return await this.userService.getByEmail(email);
  }

  @Auth(Role.MANAGER, Role.ADMIN)
  @Get('search')
  async search(@Query('query') query: string) {
    return this.userService.search(query ?? '');
  }

  @Auth(Role.MANAGER, Role.ADMIN)
  @UsePipes(new ValidationPipe({ transform: true }))
  @Put(':id/role')
  async updateRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    return this.userService.updateRole(id, dto.role);
  }

  @Post()
  async create(@Body() dto: AuthDto) {
    return await this.userService.create(dto);
  }

  @Auth()
  @Get('profile')
  async getProfile(@CurrentUser('id') id: string) {
    return this.userService.getById(id);
  }

  @Auth()
  @Patch('profile/favorites/:gameId')
  async toogleFavorite(
    @CurrentUser('id') userId: string,
    @Param('gameId') gameId: number,
  ) {
    return this.userService.toogleFavorite(gameId, userId);
  }
}
