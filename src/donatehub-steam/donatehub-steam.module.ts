import { Module } from '@nestjs/common';
import { DonatehubSteamService } from './donatehub-steam.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [DonatehubSteamService],
  exports: [DonatehubSteamService],
})
export class DonatehubSteamModule {}
