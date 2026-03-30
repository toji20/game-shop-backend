import { Module } from '@nestjs/common';
import { AdBannerService } from './ad-banner.service';
import { AdBannerController } from './ad-banner.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [AdBannerController],
  providers: [AdBannerService, PrismaService],
})
export class AdBannerModule {}
