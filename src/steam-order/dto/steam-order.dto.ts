import { IsEmail, IsNumber, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SteamOrderDto {
  @IsEmail({}, { message: 'Укажите корректный Steam аккаунт (email)' })
  account: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Сумма должна быть числом' })
  @Min(1, { message: 'Минимальная сумма пополнения: 1' })
  @Max(100000, { message: 'Максимальная сумма пополнения: 100000' })
  amount: number;

  @Type(() => Number)
  amountRub: number;
}
