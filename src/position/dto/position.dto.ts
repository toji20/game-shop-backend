import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsString } from 'class-validator';

export class PositionDto {
  @IsString()
  name: string;

  @IsNumber()
  myPrice: number;

  @IsString()
  image: string;

  @IsBoolean()
  isActive: boolean;

  @IsBoolean()
  isPublic: boolean;

  @Type(() => Number)
  @IsNumber()
  gameId: number;
}

export class PositionUpdateDto {
  @IsString()
  name: string;

  @IsNumber()
  myPrice: number;

  @IsString()
  image: string;

  @IsBoolean()
  isPublic: boolean;

  @IsBoolean()
  isActive: boolean;
}
