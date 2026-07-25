import { EnumOrderStatus, OrderType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
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
  status?: EnumOrderStatus;

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
  items!: OrderItemDto[];

  @IsOptional()
  @IsEnum(OrderType)
  type?: OrderType;

  @IsOptional()
  @IsString()
  promoCode?: string;
}

export class OrderItemDto {
  @IsNumber({}, { message: 'Количество должно быть числом' })
  quantity!: number;

  @IsNumber({}, { message: 'Цена должна быть числом' })
  price!: number;

  // ── legacy Position (обязателен, если это НЕ товар GiftAPI) ──

  @ValidateIf((o: OrderItemDto) => !o.giftapiProductId)
  @IsNumber({}, { message: 'Айди игры должен быть числом' })
  gameId?: number;

  @ValidateIf((o: OrderItemDto) => !o.giftapiProductId)
  @IsNumber({}, { message: 'Айди позиции должен быть числом' })
  positionId?: number;

  // ── GiftAPI (обязателен, если это НЕ Position-товар) ──

  @ValidateIf((o: OrderItemDto) => !o.positionId)
  @IsString({ message: 'Айди товара GiftAPI должен быть строкой' })
  giftapiProductId?: string;

  @IsOptional()
  @IsObject()
  fields?: Record<string, any>;
}
export class CreateGiftApiPaymentDto {
  @IsString()
  giftapiProductId!: string;

  @IsOptional()
  @IsInt()
  quantity?: number;

  @IsOptional()
  @IsObject()
  fields?: Record<string, any>;

  @IsOptional()
  @IsString()
  promoCode?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
