import {
  ArrayMinSize,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class BannerDto {
  @IsNotEmpty()
  @IsOptional()
  @IsString({
    message: 'Название обязательно',
  })
  title: string;

  @ArrayMinSize(1, {
    message: 'Укажите хотя бы одну картинку',
  })
  @IsNotEmpty({
    message: 'Путь к картинке не может быть пустым',
    each: true,
  })
  images: string[];

  @IsNotEmpty()
  @IsOptional()
  @IsString()
  description: string;
}
