import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GiftapiProductController } from './giftapi-product.controller';
import { GiftapiProductService } from './giftapi-product.sevice';

@Module({
  imports: [PrismaModule],
  controllers: [GiftapiProductController],
  providers: [GiftapiProductService],
  exports: [GiftapiProductService],
})
export class GiftapiProductModule {}
