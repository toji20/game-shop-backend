import { Module } from '@nestjs/common';
import { GiftapiService } from './giftapi.service';

@Module({
  providers: [GiftapiService],
  exports: [GiftapiService],
})
export class GiftapiModule {}
