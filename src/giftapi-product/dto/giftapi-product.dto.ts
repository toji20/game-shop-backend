import { OrderType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class FaqItemDto {
  @IsString()
  question!: string;

  @IsString()
  answer!: string;
}

export class WarningItemDto {
  @IsString()
  title!: string;

  @IsString()
  text!: string;

  @IsEnum(['danger', 'alert'])
  variant!: 'danger' | 'alert';
}

export class CreateGiftApiProductDto {
  @IsString()
  id!: string;

  @IsString()
  giftapiProductId!: string;

  @IsString()
  giftapiSkuId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsString()
  type!: string;

  @IsString()
  denominationType!: string;

  @IsOptional()
  @IsNumber()
  gameId?: number;

  @IsOptional()
  @IsNumber()
  positionCategoryId?: number;

  @IsString()
  category!: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsString()
  currency!: string;

  @IsOptional()
  @IsNumber()
  stock?: number;

  @IsOptional()
  @IsNumber()
  maxPerOrder?: number;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsEnum(OrderType)
  orderType?: OrderType;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  iconWide?: string;

  @IsOptional()
  @IsString()
  bgDesktop?: string;

  @IsOptional()
  @IsString()
  bgMobile?: string;

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
  instructions?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FaqItemDto)
  faq?: FaqItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WarningItemDto)
  warnings?: WarningItemDto[];
}

export class UpdateGiftApiProductDto {
  @IsOptional()
  @IsString()
  giftapiProductId?: string;

  @IsOptional()
  @IsString()
  giftapiSkuId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  denominationType?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  gameId?: number;

  @IsOptional()
  @IsNumber()
  positionCategoryId?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  stock?: number;

  @IsOptional()
  @IsNumber()
  maxPerOrder?: number;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsEnum(OrderType)
  orderType?: OrderType;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  instructions?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WarningItemDto)
  warnings?: WarningItemDto[];
}
