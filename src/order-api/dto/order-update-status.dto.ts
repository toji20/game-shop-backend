import { DonateHubStatus, EnumOrderStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class OrderUpdateStatus {
  @IsEnum(EnumOrderStatus)
  @IsNotEmpty()
  status: EnumOrderStatus;
}

export class OrderItemDonateHubStatusDto {
  @IsEnum(DonateHubStatus)
  @IsNotEmpty()
  status: DonateHubStatus;
}

export class SteamOrderDonateHubStatusDto {
  @IsEnum(DonateHubStatus)
  @IsNotEmpty()
  status: DonateHubStatus;
}
