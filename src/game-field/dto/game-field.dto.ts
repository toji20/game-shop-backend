import { IsBoolean, IsNumber, IsString } from 'class-validator';

export class GameFieldDto {
  @IsString()
  label: string;

  @IsBoolean()
  required: boolean;

  @IsNumber()
  gameId: number;
}
