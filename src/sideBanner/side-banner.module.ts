import { Module } from '@nestjs/common';
import { SideBannerService } from './side-banner.service';
import { SideBannerController } from './side-banner.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [SideBannerController],
  providers: [SideBannerService, PrismaService],
})
export class SideBannerModule {}
