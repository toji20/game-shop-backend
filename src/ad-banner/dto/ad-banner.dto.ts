import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AdBannerDto {
  @IsNotEmpty()
  @IsOptional()
  @IsString({
    message: 'Название обязательно',
  })
  title: string;

  @IsOptional()
  @IsString({
    message: 'Ссылка обязательна',
  })
  link: string;

  @IsString()
  image: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsOptional()
  @IsBoolean()
  isActive: boolean;
}
