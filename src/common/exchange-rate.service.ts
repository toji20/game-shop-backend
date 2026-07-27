import { Injectable, Logger } from '@nestjs/common';

export interface ExchangeRates {
  usdToRub: number;
  kztToRub: number;
}

/** Минимальная форма ответа cbr-xml-daily.ru — только нужные нам поля. */
interface CbrDailyResponse {
  Valute: {
    USD: { Value: number };
    KZT: { Value: number; Nominal: number };
  };
}

/**
 * Курсы валют для расчёта цены GiftAPI-товаров с denominationType='custom'
 * (например, пополнение Steam-кошелька на произвольную сумму, где в каталоге
 * нет фиксированной цены — она считается из суммы, введённой пользователем).
 *
 * Раньше этот же код (fetch курсов ЦБ) жил внутри SteamOrderService и
 * дублировался бы при переносе Steam-пополнения на GiftAPI — вынесен сюда,
 * чтобы использовать из одного места.
 */
@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);
  private cached: { rates: ExchangeRates; fetchedAt: number } | null = null;
  // Курс ЦБ обновляется раз в день — 10 минут кэша достаточно, чтобы не
  // дёргать внешний API на каждый заказ, и достаточно свежо для оплаты
  private readonly CACHE_TTL_MS = 10 * 60 * 1000;

  async getRates(): Promise<ExchangeRates> {
    if (this.cached && Date.now() - this.cached.fetchedAt < this.CACHE_TTL_MS) {
      return this.cached.rates;
    }

    try {
      const res = await fetch('https://www.cbr-xml-daily.ru/daily_json.js');
      const data: CbrDailyResponse = await res.json();

      const usdToRub = data.Valute.USD.Value;
      const kztToRub = data.Valute.KZT.Value / data.Valute.KZT.Nominal;

      const rates: ExchangeRates = { usdToRub, kztToRub };
      this.cached = { rates, fetchedAt: Date.now() };
      this.logger.log(`Курсы ЦБ обновлены: USD=${usdToRub}, KZT=${kztToRub}`);
      return rates;
    } catch (err) {
      this.logger.error(
        'Ошибка получения курсов ЦБ, использую запасные значения:',
        err,
      );
      return { usdToRub: 90, kztToRub: 0.2 };
    }
  }
}
