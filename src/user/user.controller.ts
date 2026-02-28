import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthDto } from './dto/auth.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { CurrentUser } from './decorators/user.decorator';

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
