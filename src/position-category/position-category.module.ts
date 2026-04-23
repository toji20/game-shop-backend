import { Module } from '@nestjs/common';
import { PositionCategoryService } from './position-category.service';
import { PositionCategoryController } from './position-category.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [PositionCategoryController],
  providers: [PositionCategoryService, PrismaService],
})
export class PositionCategoryModule {}
