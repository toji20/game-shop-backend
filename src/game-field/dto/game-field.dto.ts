import { IsBoolean, IsNumber, IsString } from 'class-validator';

export class GameFieldDto {
  @IsString()
  label: string;

  @IsBoolean()
  required: boolean;

  @IsNumber()
  gameId: number;
}

export class GameFieldUpdateDto {
  @IsString()
  label: string;

  @IsBoolean()
  required: boolean;
}
