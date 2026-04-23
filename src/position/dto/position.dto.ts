import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class PositionDto {
  @IsString()
  name: string;

  @Type(() => Number)
  @IsNumber()
  myPrice: number;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @Type(() => Number)
  @IsNumber()
  gameId: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  discount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  categoryId?: number;
}

export class PositionUpdateDto {
  @IsString()
  name: string;

  @Type(() => Number)
  @IsNumber()
  myPrice: number;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  discount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  categoryId?: number;
}
