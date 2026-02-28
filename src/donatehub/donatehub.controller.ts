import { Controller, Get, Param, Post } from '@nestjs/common';
import { DonateHubService } from './donatehub.service';
import { DonateHubSyncService } from './donatehub.sync.service';
import { Auth } from 'src/auth/decorators/authorization.decorator';
import { CheckRole } from 'src/auth/decorators/check-role.decorator';
import { Role } from '@prisma/client';

@Controller('donatehub')
export class DonateHubController {
  constructor(
    private readonly donateHubService: DonateHubService,
    private readonly donateHubSyncService: DonateHubSyncService,
  ) {}

  @Get('games')
  async getAllGames() {
    const games = await this.donateHubService.getGames();
    return games;
  }

  @Get('games/:id')
  async getGameById(@Param('id') id: number) {
    const game = await this.donateHubService.getGameById(Number(id));
    return game;
  }

  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER)
  @Post('sync')
  async syncAllGames() {
    await this.donateHubSyncService.syncAllGames();
    return { message: 'Все игры синхронизированы с базой' };
  }
}
