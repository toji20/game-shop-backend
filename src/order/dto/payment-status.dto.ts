import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * Статусы платежа Т-Банка, которые реально встречаются в нотификациях
 * при одностадийной оплате (PayType='O'): NEW -> AUTHORIZED -> CONFIRMED.
 * REJECTED/CANCELED/DEADLINE_EXPIRED — неуспешные исходы.
 */
export type TBankPaymentStatus =
  | 'NEW'
  | 'AUTHORIZED'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'REFUNDED'
  | 'PARTIAL_REFUNDED'
  | 'REVERSED'
  | 'CANCELED'
  | 'PENDING'
  | 'DEADLINE_EXPIRED'
  | 'ATTEMPTS_EXPIRED'
  | 'EXPIRED';

/**
 * Тело нотификации, которое Т-Банк присылает POST-запросом на NotificationURL.
 * Имя класса PaymentStatusDto сохранено (было под ЮKassa), чтобы не пришлось
 * менять импорты в контроллере вебхука — но содержимое теперь плоское,
 * без вложенного object, как было у ЮKassa.
 *
 * ВАЖНО: PaymentId и CardId — ЧИСЛА (проверено по реальной нотификации от
 * Т-Банка: "PaymentId":8928986069, "CardId":692989306 — без кавычек).
 *
 * ВАЖНО: перед обработкой обязательно проверяй Token через
 * TBankService.verifyNotificationToken(dto) — см. order.service.ts.
 */
export class PaymentStatusDto {
  @IsString()
  TerminalKey!: string;

  @IsString()
  OrderId!: string;

  @IsBoolean()
  Success!: boolean;

  @IsIn([
    'NEW',
    'AUTHORIZED',
    'CONFIRMED',
    'REJECTED',
    'REFUNDED',
    'PARTIAL_REFUNDED',
    'REVERSED',
    'CANCELED',
    'PENDING',
    'DEADLINE_EXPIRED',
    'ATTEMPTS_EXPIRED',
    'EXPIRED',
  ])
  Status!: TBankPaymentStatus;

  @IsNumber()
  PaymentId!: number;

  @IsString()
  ErrorCode!: string;

  @IsNumber()
  Amount!: number; // в копейках

  @IsOptional()
  @IsNumber()
  CardId?: number;

  @IsOptional()
  @IsString()
  Pan?: string;

  @IsOptional()
  @IsString()
  ExpDate?: string;

  @IsOptional()
  @IsString()
  RebillId?: string;

  @IsString()
  Token!: string;

  @IsOptional()
  @IsObject()
  Data?: Record<string, string>;

  @IsOptional()
  @IsObject()
  Receipt?: Record<string, any>;
}

/**
 * paymentMethod теперь не выбирает конкретный способ оплаты на стороне
 * Т-Банка (это происходит на его собственной платёжной форме/T-Pay/SBP —
 * настраивается в личном кабинете терминала). Оставлен только для расчёта
 * комиссии (см. commissionRate в order.service.ts) — при желании можно
 * убрать совсем и считать комиссию по единой ставке.
 */
export enum PaymentMethod {
  BANK_CARD = 'bank_card',
  SBP = 'sbp',
  SBERBANK = 'sberbank',
  TINKOFF_BANK = 'tinkoff_bank',
}
