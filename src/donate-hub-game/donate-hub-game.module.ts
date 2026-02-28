import { Module } from '@nestjs/common';
import { DonateHubGameController } from './donate-hub-game.controller';
import { DonatehubGameService } from './donate-hub-game.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [PrismaModule],
  controllers: [DonateHubGameController],
  providers: [DonatehubGameService, PrismaService],
})
export class DonateHubGameModule {}
