import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { RolesGuard } from 'src/auth/decorators/check-role-guard';
import { JwtStrategy } from 'src/auth/strategies/jwt.strategy';

@Module({
  controllers: [UserController],
  providers: [UserService, PrismaService, JwtStrategy, RolesGuard],
})
export class UserModule {}
