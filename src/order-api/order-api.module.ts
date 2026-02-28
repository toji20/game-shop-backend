import { Module } from '@nestjs/common';
import { OrderApiService } from './order-api.service';
import { OrderApiController } from './order-api.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [OrderApiController],
  providers: [OrderApiService, PrismaService],
})
export class OrderApiModule {}
