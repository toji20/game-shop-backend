import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { Auth } from 'src/auth/decorators/authorization.decorator';
import { ReviewDto } from './dto/review.dto';
import { CurrentUser } from 'src/user/decorators/user.decorator';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Auth()
  @Get('all-reviews')
  async getAll() {
    return this.reviewService.getAll();
  }

  @Auth()
  @Get('by-game/:gameId')
  async getBygameId(@Param('gameId') gameId: number) {
    return this.reviewService.getBygameId(gameId);
  }

  @UsePipes(new ValidationPipe())
  @HttpCode(200)
  @Post(':gameId/:storeId')
  @Auth()
  async create(
    @Body() dto: ReviewDto,
    @Param('gameId') gameId: number,
    @CurrentUser('id') userId: string,
  ) {
    return this.reviewService.create(dto, gameId, userId);
  }

  @HttpCode(200)
  @Auth()
  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.reviewService.delete(id, userId);
  }
}
