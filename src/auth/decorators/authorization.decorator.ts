import { applyDecorators, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtGuard } from '../guards/jwt-guard';
import { CheckRole } from './check-role.decorator';
import { RolesGuard } from './check-role-guard';

export function Auth(...roles: Role[]) {
  return applyDecorators(
    ...(roles.length > 0 ? [CheckRole(...roles)] : []),
    UseGuards(JwtGuard, RolesGuard),
  );
}
