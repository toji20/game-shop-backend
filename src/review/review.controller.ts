import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
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

  @Get('all-reviews')
  async getAll() {
    return this.reviewService.getAll();
  }

  @Get('paginated-all')
  async getAllPaginated(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.reviewService.getAllPaginated(Number(page), Number(limit));
  }

  @Get('paginated/:gameId')
  async getPaginated(
    @Param('gameId') gameId: number,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.reviewService.getByGameIdPaginated(
      Number(gameId),
      Number(page),
      Number(limit),
    );
  }

  @Get('by-game/:gameId')
  async getBygameId(@Param('gameId') gameId: number) {
    return this.reviewService.getBygameId(gameId);
  }

  @Get('stats')
  async getStats(@Query('gameId') gameId?: string) {
    return this.reviewService.getStats(gameId ? Number(gameId) : undefined);
  }

  @UsePipes(new ValidationPipe())
  @HttpCode(200)
  @Post(':gameId')
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
