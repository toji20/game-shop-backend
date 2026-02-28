import { Controller, Get } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Auth } from 'src/auth/decorators/authorization.decorator';
import { StatisticsService } from './statistics.service';

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  // GET /statistics/main
  // Карточки: общая выручка, средняя выручка, заказы, пользователи, рейтинг
  @Get('main')
  @Auth(Role.ADMIN)
  async getMain() {
    return this.statisticsService.getMainStatistics();
  }

  // GET /statistics/detailed
  // График продаж по дням, топ игр, последние пользователи
  @Get('detailed')
  @Auth(Role.ADMIN)
  async getDetailed() {
    return this.statisticsService.getDetailedStatistics();
  }
}
