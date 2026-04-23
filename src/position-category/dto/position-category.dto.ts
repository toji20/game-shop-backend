import { IsNumber, IsString } from 'class-validator';

export class PositionCategoryDto {
  @IsString()
  name: string;

  @IsNumber()
  gameId: number;
}

export class PositionCategoryUpdateDto {
  @IsString()
  name: string;
}
