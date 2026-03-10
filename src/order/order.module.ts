import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { DonatehubGameService } from 'src/donate-hub-game/donate-hub-game.service';
import { DonateHubGameModule } from 'src/donate-hub-game/donate-hub-game.module';
import { SteamOrderModule } from 'src/steam-order/steam-order.module';
import { OrderGateway } from './order.gateway';

@Module({
  imports: [DonateHubGameModule, SteamOrderModule],
  controllers: [OrderController],
  providers: [OrderService, PrismaService, DonatehubGameService, OrderGateway],
  exports: [OrderGateway],
})
export class OrderModule {}
