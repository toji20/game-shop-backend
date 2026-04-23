import { Module } from '@nestjs/common';
import { SteamOrderService } from './steam-order.service';
import { SteamOrderController } from './steam-order.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DonatehubSteamModule } from 'src/donatehub-steam/donatehub-steam.module';
import { PromoModule } from 'src/promo/promo.module';

@Module({
  imports: [PrismaModule, DonatehubSteamModule, PromoModule],
  providers: [SteamOrderService],
  controllers: [SteamOrderController],
  exports: [SteamOrderService],
})
export class SteamOrderModule {}
