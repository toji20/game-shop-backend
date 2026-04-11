import { IsNotEmpty, IsString } from 'class-validator';

export class SideBannerDto {
  @IsString({
    message: 'Ссылка обязательна',
  })
  link: string;

  @IsNotEmpty({
    message: 'Путь к картинке не может быть пустым',
    each: true,
  })
  @IsString()
  image: string;
}
