import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class BannerDto {
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

  @IsOptional()
  @IsString()
  desktopImage?: string;

  @IsOptional()
  @IsString()
  mobileImage?: string;

  @IsOptional()
  @IsString()
  description: string;
}
