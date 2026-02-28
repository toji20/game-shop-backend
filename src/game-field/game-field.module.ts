import { Module } from '@nestjs/common';
import { GameFieldService } from './game-field.service';
import { GameFieldController } from './game-field.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [GameFieldController],
  providers: [GameFieldService, PrismaService],
})
export class GameFieldModule {}
