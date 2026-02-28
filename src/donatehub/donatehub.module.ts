import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { DonateHubService } from './donatehub.service';
import { DonateHubSyncService } from './donatehub.sync.service';
import { DonateHubController } from './donatehub.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [DonateHubController],
  providers: [DonateHubService, DonateHubSyncService, PrismaService],
})
export class DonatehubModule {}
