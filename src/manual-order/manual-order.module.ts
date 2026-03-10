import { Module } from '@nestjs/common';
import { ManualOrderController } from './manual-order.controller';
import { ManualOrderService } from './manual-order.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ManualOrderController],
  providers: [ManualOrderService],
  exports: [ManualOrderService],
})
export class ManualOrderModule {}
