import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface TBankInitParams {
  Amount: number; // сумма В КОПЕЙКАХ
  OrderId: string;
  Description?: string;
  NotificationURL?: string;
  SuccessURL?: string;
  FailURL?: string;
  // 'O' — одностадийная оплата (аналог capture:true в ЮKassa), 'T' — двухстадийная
  PayType?: 'O' | 'T';
  Language?: 'ru' | 'en';
  DATA?: Record<string, string>;
  // при подключённой онлайн-кассе Receipt обязателен — пробрасывай его,
  // если используешь фискализацию (структуру см. в SKILL/доке метода Init)
  Receipt?: Record<string, any>;
}

export interface TBankInitResponse {
  Success: boolean;
  ErrorCode: string;
  TerminalKey: string;
  Status: string;
  PaymentId: string;
  OrderId: string;
  Amount: number;
  PaymentURL?: string;
  Message?: string;
  Details?: string;
}

export interface TBankGetStateResponse {
  Success: boolean;
  ErrorCode: string;
  TerminalKey: string;
  Status: string;
  PaymentId: string;
  OrderId: string;
  Amount: number;
  Message?: string;
  Details?: string;
}

@Injectable()
export class TBankService {
  private readonly logger = new Logger(TBankService.name);
  private readonly terminalKey: string;
  private readonly terminalPassword: string;
  private readonly apiUrl: string;

  constructor(private readonly configService: ConfigService) {
    const terminalKey = this.configService.get<string>('TBANK_TERMINAL_KEY');
    const terminalPassword = this.configService.get<string>(
      'TBANK_TERMINAL_PASSWORD',
    );
    if (!terminalKey || !terminalPassword) {
      throw new Error('T-Bank env variables are not defined');
    }
    this.terminalKey = terminalKey;
    this.terminalPassword = terminalPassword;
    this.apiUrl =
      this.configService.get<string>('TBANK_API_URL') ??
      'https://securepay.tinkoff.ru/v2';
  }

  /**
   * Формирует токен запроса/нотификации по алгоритму Т-Банка:
   * 1. Берём только скалярные поля корневого объекта (объекты/массивы вроде
   *    Receipt, DATA, Data — игнорируются, они не участвуют в подписи).
   * 2. Добавляем пару Password.
   * 3. Сортируем пары по ключу.
   * 4. Конкатенируем только значения.
   * 5. SHA-256 (hex).
   */
  private generateToken(payload: Record<string, any>): string {
    const entries: [string, string][] = Object.entries(payload)
      .filter(
        ([key, value]) =>
          key !== 'Token' &&
          value !== undefined &&
          value !== null &&
          typeof value !== 'object',
      )
      .map(([key, value]) => [key, String(value)]);

    entries.push(['Password', this.terminalPassword]);
    entries.sort(([a], [b]) => a.localeCompare(b));

    const concatenated = entries.map(([, value]) => value).join('');
    return crypto
      .createHash('sha256')
      .update(concatenated, 'utf8')
      .digest('hex');
  }

  /**
   * Инициировать платёж (аналог createPayment из YooCheckout).
   * Amount передаётся В КОПЕЙКАХ — не забудь умножить сумму в рублях на 100
   * и округлить до целого перед вызовом.
   */
  async init(params: TBankInitParams): Promise<TBankInitResponse> {
    const body: Record<string, any> = {
      TerminalKey: this.terminalKey,
      ...params,
    };
    body.Token = this.generateToken(body);

    const response = await fetch(`${this.apiUrl}/Init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as TBankInitResponse;

    if (!data.Success) {
      this.logger.error(
        `T-Bank Init вернул ошибку: ${data.ErrorCode} ${data.Message ?? ''} ${data.Details ?? ''}`,
      );
    }

    return data;
  }

  /** Получить актуальный статус платежа — полезно для сверки/идемпотентности вебхука. */
  async getState(paymentId: string): Promise<TBankGetStateResponse> {
    const body: Record<string, any> = {
      TerminalKey: this.terminalKey,
      PaymentId: paymentId,
    };
    body.Token = this.generateToken(body);

    const response = await fetch(`${this.apiUrl}/GetState`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return (await response.json()) as TBankGetStateResponse;
  }

  /**
   * Отменить/вернуть платёж (Cancel). Для одностадийной оплаты (PayType='O')
   * до захвата денег — отмена, после — возврат (логика на стороне Т-Банка).
   */
  async cancel(paymentId: string, amount?: number) {
    const body: Record<string, any> = {
      TerminalKey: this.terminalKey,
      PaymentId: paymentId,
      ...(amount !== undefined ? { Amount: amount } : {}),
    };
    body.Token = this.generateToken(body);

    const response = await fetch(`${this.apiUrl}/Cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return response.json();
  }

  /**
   * КРИТИЧНО: проверка подлинности вебхука. Старый код с ЮKassa вебхуки вообще
   * не валидировал — с Т-Банком это обязательный шаг, иначе кто угодно,
   * зная формат payload, может дёрнуть эндпоинт и обмануть систему,
   * что деньги якобы получены.
   *
   * Сверяем токен из тела нотификации с токеном, посчитанным нами по тем же
   * правилам (см. generateToken) над остальными полями тела.
   */
  verifyNotificationToken(notification: Record<string, any>): boolean {
    const { Token: receivedToken, ...rest } = notification;
    if (!receivedToken) return false;
    const expectedToken = this.generateToken(rest);
    // сравнение постоянного времени, чтобы не давать возможность timing-атаки
    const a = Buffer.from(expectedToken);
    const b = Buffer.from(receivedToken);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }
}
