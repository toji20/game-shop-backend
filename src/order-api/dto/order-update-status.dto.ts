import { EnumOrderStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class OrderUpdateStatus {
  @IsEnum(EnumOrderStatus)
  @IsNotEmpty()
  status: EnumOrderStatus;
}
