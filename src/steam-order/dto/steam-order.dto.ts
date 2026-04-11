import {
  IsNumber,
  IsOptional,
  IsIn,
  Max,
  Min,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export type SteamCurrency = 'RUB' | 'KZT' | 'USD';

export class SteamCheckDto {
  @IsString({ message: 'Укажите корректный Steam логин' })
  account: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Сумма должна быть числом' })
  @Min(1, { message: 'Минимальная сумма пополнения: 1' })
  @Max(100000, { message: 'Максимальная сумма пополнения: 100000' })
  amount: number;

  @IsOptional()
  @IsIn(['RUB', 'KZT', 'USD'])
  currency?: SteamCurrency;
}

export class SteamOrderDto {
  @IsString({ message: 'Укажите корректный Steam логин' })
  account: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Сумма должна быть числом' })
  @Min(1, { message: 'Минимальная сумма пополнения: 1' })
  @Max(100000, { message: 'Максимальная сумма пополнения: 100000' })
  amountRub: number;

  @IsOptional()
  @IsIn(['RUB', 'KZT', 'USD'])
  currency?: SteamCurrency;
}
