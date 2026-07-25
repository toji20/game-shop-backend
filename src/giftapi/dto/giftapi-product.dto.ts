import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class GiftApiProductDto {
  id!: string; // UUID
  name!: string;
  type!:
    | 'voucher'
    | 'recharge_fixed'
    | 'recharge'
    | 'voucher_open_range'
    | 'esim'
    | 'other';
  denomination_type!: 'fixed' | 'custom';
  category!: {
    id: number;
    name: string;
  };
  description?: string;
  image!: string;
  attributes?: Record<string, any>;
  skus!: GiftApiSkuDto[];
}

export class GiftApiSkuDto {
  id!: string; // UUID
  name!: string;
  price?: number; // null for custom denomination
  currency!: string;
  stock!: number;
  max_per_order!: number;
  image!: string;
  attributes?: Record<string, any>;
  markup_percent?: number; // for custom denomination
  markup_fixed?: number; // for custom denomination
  rate?: number; // exchange rate
}

export class GiftApiOrderDto {
  id!: string; // UUID
  external_id!: string;
  status!:
    | 'created'
    | 'processing'
    | 'completed'
    | 'cancelled'
    | 'failed'
    | 'partially_completed';
  total_amount!: number;
  currency!: string;
  metadata?: Record<string, any>;
  @IsString()
  @IsNotEmpty()
  giftapiProductId!: string;

  /**
   * Поля заказа, специфичные для типа товара
   * (например номер счёта, логин, ICCID и т.п.)
   */
  @IsObject()
  @IsOptional()
  fields?: Record<string, any>;

  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsOptional()
  promoCode?: string;

  created_at!: string;
  items!: GiftApiOrderItemDto[];
}

export class GiftApiOrderItemDto {
  sku_id!: string;
  sku_name!: string;
  quantity!: number;
  price!: number;
  currency!: string;
  amount?: number; // for custom denomination
  status!: 'pending' | 'processing' | 'completed' | 'failed';
  delivery_data?: Array<Record<string, any>>;
  customer_data?: Record<string, any>;
  error_message?: string;
}

export class GiftApiWebhookPayloadDto {
  event!: 'order.status_changed';
  timestamp!: string;
  idempotency_key!: string;
  data!: {
    order: GiftApiOrderDto;
  };
}
