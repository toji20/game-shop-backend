import { OrderType } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class GameDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  releaseDate?: string;

  @IsOptional()
  @IsString()
  ageLimit?: string;

  @IsOptional()
  @IsString()
  genre?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  image?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  instructions?: string[];

  @IsBoolean()
  isActive: boolean;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsEnum(OrderType, {
    message:
      'Статус должен быть одним из: ' + Object.values(OrderType).join(', '),
  })
  type: OrderType;
}
