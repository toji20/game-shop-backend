import { OrderType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class GameDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsString()
  image: string;

  @IsBoolean()
  isActive: boolean;

  @IsString()
  @IsOptional()
  categoryId: string;

  @IsEnum(OrderType, {
    message:
      'Статус должен быть одним из: ' + Object.values(OrderType).join(', '),
  })
  type: OrderType;
}
