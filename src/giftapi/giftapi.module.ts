import { Module } from '@nestjs/common';
import { GiftapiService } from './giftapi.service';
import { GiftapiSyncService } from './giftapi-sync.service';
import { GiftapiOrderService } from './giftapi-order.service';
import { GiftapiCatalogController } from './giftapi-catalog.controller';
import { GiftapiWebhookController } from './giftapi-webhook.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [GiftapiService, GiftapiSyncService, GiftapiOrderService],
  controllers: [GiftapiCatalogController, GiftapiWebhookController],
  exports: [GiftapiService, GiftapiSyncService, GiftapiOrderService],
})
export class GiftapiModule {}
