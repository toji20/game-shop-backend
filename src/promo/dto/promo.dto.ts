import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PromoCodeScopeDto {
  ALL = 'ALL',
  GAMES_ONLY = 'GAMES_ONLY',
  STEAM_ONLY = 'STEAM_ONLY',
}

export enum PromoTarget {
  GAME = 'GAME',
  STEAM = 'STEAM',
}

export class PromoCodeCreateDto {
  @IsString()
  code: string;

  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  discount: number;

  @IsOptional()
  @IsEnum(PromoCodeScopeDto)
  scope?: PromoCodeScopeDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  usageLimit?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class PromoCodeUpdateDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  discount?: number;

  @IsOptional()
  @IsEnum(PromoCodeScopeDto)
  scope?: PromoCodeScopeDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  usageLimit?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class ApplyPromoCodeDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsEnum(PromoTarget)
  target?: PromoTarget;
}
