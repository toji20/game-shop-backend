import { EnumOrderStatus, OrderType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from './payment-status.dto';

export class OrderDto {
  @IsOptional()
  @IsEnum(EnumOrderStatus, {
    message:
      'Статус заказа должен быть один из: ' +
      Object.values(EnumOrderStatus).join(', '),
  })
  status: EnumOrderStatus;

  @IsOptional()
  @IsEnum(PaymentMethod, {
    message:
      'Способ оплаты должен быть один из: ' +
      Object.values(PaymentMethod).join(', '),
  })
  paymentMethod: PaymentMethod = PaymentMethod.BANK_CARD; // по умолчанию карта

  @IsArray({ message: 'В заказе нет ни одного товара' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsEnum(OrderType)
  type: OrderType;

  @IsOptional()
  @IsString()
  promoCode?: string;
}

export class OrderItemDto {
  @IsNumber({}, { message: 'Количество должно быть числом' })
  quantity: number;

  @IsNumber({}, { message: 'Цена должна быть числом' })
  price: number;

  @IsNumber({}, { message: 'Айди игры должен быть числом' })
  gameId: number;

  @IsNumber({}, { message: 'Айди позиции должен быть числом' })
  positionId: number;

  @IsOptional()
  @IsObject()
  fields?: Record<string, any>;
}
