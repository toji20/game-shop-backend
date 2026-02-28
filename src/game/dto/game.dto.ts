import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class GameDto {
  @IsString()
  name: string;

  @IsString()
  image: string;

  @IsBoolean()
  isActive: boolean;

  @IsString()
  @IsOptional()
  categoryId: string;
}
