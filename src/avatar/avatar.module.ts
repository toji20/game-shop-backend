import { Module } from '@nestjs/common';
import { AvatarService } from './avatar.service';
import { AvatarController } from './avatar.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [AvatarController],
  providers: [AvatarService, PrismaService],
  exports: [AvatarService],
})
export class AvatarModule {}
