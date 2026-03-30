import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';

export class ReviewDto {
  @IsString({ message: 'Текст отзыва должен быть строкой' })
  @IsNotEmpty({ message: 'Текст отзыва не может быть пустым' })
  text: string;

  @IsNumber({}, { message: 'Рейтинг должен быть числом' })
  @IsNotEmpty({ message: 'Рейтинг не может быть пустым' })
  @Max(10, { message: 'Рейтинг не может быть больше 10' })
  @Min(1, { message: 'Рейтинг не может быть меньше 1' })
  rating: number;
}
