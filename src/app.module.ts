import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { CategoryModule } from './category/category.module';
import { FileModule } from './file/file.module';
import { OrderModule } from './order/order.module';
import { ReviewModule } from './review/review.module';
import { DonatehubModule } from './donatehub/donatehub.module';
import { PositionModule } from './position/position.module';
import { GameModule } from './game/game.module';
import { DonateHubGameModule } from './donate-hub-game/donate-hub-game.module';
import { DonatehubSteamModule } from './donatehub-steam/donatehub-steam.module';
import { SteamOrderModule } from './steam-order/steam-order.module';
import { BannerModule } from './banner/banner.module';
import { OrderApiModule } from './order-api/order-api.module';
import { ManualOrderModule } from './manual-order/manual-order.module';
import { GameFieldModule } from './game-field/game-field.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    UserModule,
    PrismaModule,
    CategoryModule,
    FileModule,
    OrderModule,
    ReviewModule,
    DonatehubModule,
    PositionModule,
    GameModule,
    DonateHubGameModule,
    DonatehubSteamModule,
    SteamOrderModule,
    BannerModule,
    OrderApiModule,
    ManualOrderModule,
    GameFieldModule,
  ],
})
export class AppModule {}
