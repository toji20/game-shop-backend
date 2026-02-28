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

  @IsNumber()
  gameId: number;
}
