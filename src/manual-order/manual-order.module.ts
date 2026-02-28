import { Module } from '@nestjs/common';
import { ManualOrderService } from './manual-order.service';
import { ManualOrderController } from './manual-order.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [ManualOrderController],
  providers: [ManualOrderService, PrismaService],
})
export class ManualOrderModule {}
