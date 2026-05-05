import { IsNotEmpty, IsString } from 'class-validator';

export class AvatarDto {
  @IsNotEmpty()
  @IsString({ message: 'Изображение обязательно' })
  image: string;
}
