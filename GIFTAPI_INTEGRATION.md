# GiftAPI Integration Guide

## Переменные окружения

Добавьте в `.env` файл:

```env
# GiftAPI Configuration
GIFTAPI_BASE_URL=https://api.giftapi.io/v1/partner
GIFTAPI_TOKEN=your_s2s_token_here
GIFTAPI_SECRET=your_partner_secret_here
```

## Инициализация

### 1. Синхронизация каталога

После запуска приложения синхронизируйте каталог товаров:

```bash
curl -X POST http://localhost:5000/api/giftapi/sync
```

Или в коде:

```typescript
import { GiftapiSyncService } from 'src/giftapi/giftapi-sync.service';

@Injectable()
export class MyService {
  constructor(private syncService: GiftapiSyncService) {}

  async init() {
    await this.syncService.syncFullCatalog();
  }
}
```

## API Endpoints

### Каталог товаров

#### Получить все категории
```
GET /api/giftapi/categories
```

#### Получить товары по категории
```
GET /api/giftapi/category/:category
```

#### Получить товары по типу
```
GET /api/giftapi/type/:type
```

#### Получить прайс-лист
```
GET /api/giftapi/pricelist
```

#### Получить товар по SKU
```
GET /api/giftapi/sku/:skuId
```

### Заказы

#### Создать заказ через GiftAPI
```
POST /api/orders/giftapi/create

Body:
{
  "skuId": "019bc0dd-8562-7173-afd9-a5cc534fafb7",
  "fields": {
    "quantity": 1
  }
}

Response:
{
  "success": true,
  "data": {
    "orderId": "order-uuid",
    "giftapiOrderId": "giftapi-order-uuid",
    "status": "completed",
    "items": [...]
  }
}
```

### Webhooks

GiftAPI будет отправлять вебхуки на:
```
POST /api/giftapi/webhooks/order-status
```

## Структура данных

### GiftApiProduct (БД)

Для хранения синхронизированного каталога:

```prisma
model GiftApiProduct {
  id                    String   @id
  giftapiProductId      String   @unique
  giftapiSkuId          String   @unique
  name                  String
  description           String?
  type                  String   // voucher, recharge_fixed, esim, etc
  denominationType      String   // fixed, custom
  category              String
  price                 Decimal?
  currency              String   @default("USD")
  stock                 Int      @default(0)
  maxPerOrder           Int      @default(1)
  attributes            Json?
  image                 String?
  syncedAt              DateTime @updatedAt
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  deletedAt             DateTime?
}
```

### Order расширения

Добавлены поля в существующую таблицу `Order`:

```prisma
model Order {
  // ... existing fields
  giftapiOrderId        String?
  giftapiExternalId     String?   @unique
  giftapiStatus         String?
  giftapiDeliveryData   Json?
  giftapiProductId      String?   // reference to GiftApiProduct
}
```

## Примеры использования

### Создание заказа через фронтенд

```typescript
// 1. Получить доступные товары
const response = await fetch('/api/giftapi/type/voucher');
const { data: products } = await response.json();

// 2. Выбрать товар и создать заказ
const product = products[0];
const orderResponse = await fetch('/api/orders/giftapi/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    skuId: product.giftapiSkuId,
    fields: {
      quantity: 1
    }
  })
});

const order = await orderResponse.json();
console.log('GiftAPI Order:', order.data.giftapiOrderId);
```

### eSIM Top-up

```typescript
const response = await this.giftapiOrderService.topupEsim(
  orderId,
  'iccid-value',
  'sku-id-for-esim-package'
);
```

## Типы товаров GiftAPI

- **voucher** - Подарочные карты
- **recharge_fixed** - Пополнение с фиксированной суммой
- **recharge** - Пополнение с пользовательской суммой
- **voucher_open_range** - Подарочные карты с диапазоном
- **esim** - eSIM профили
- **other** - Прочие товары

## Обработка Webhook'ов

GiftAPI отправляет webhook'и при изменении статуса заказа:

```json
{
  "event": "order.status_changed",
  "timestamp": "2026-01-15T12:58:23+00:00",
  "idempotency_key": "550e8400-e29b-41d4-a716-446655440000",
  "data": {
    "order": {
      "id": "giftapi-order-id",
      "external_id": "order-from-our-system",
      "status": "completed",
      "total_amount": 29.09,
      "items": [...]
    }
  }
}
```

Система автоматически:
1. Проверяет подпись webhook'а
2. Находит соответствующий заказ в нашей БД по `external_id`
3. Обновляет статус и сохраняет delivery данные

## Проблемы и решения

### SKU не найден
```
Error: SKU {skuId} not found in catalog. Please sync catalog first.
```
Решение: Сначала синхронизируйте каталог через `POST /api/giftapi/sync`

### Товар закончился
```
Error: SKU {skuId} is out of stock
```
Решение: Товар отсутствует в наличии, попробуйте другой SKU

### Ошибка подписи webhook'а
Проверьте, что в `.env` правильно установлены `GIFTAPI_TOKEN` и `GIFTAPI_SECRET`

## Интеграция с YooKassa

**Важно:** GiftAPI используется ТОЛЬКО для каталога и заказов товаров.
Платежная система остается YooKassa. Процесс:

1. Пользователь выбирает товар из GiftAPI каталога
2. Заказ создается в нашей БД
3. Пользователь платит через YooKassa
4. После успешной оплаты заказ отправляется в GiftAPI
5. GiftAPI доставляет товар (отправляет delivery данные через webhook)

## Логирование

Все операции GiftAPI логируются в console:

```
[GiftapiService] GiftAPI Request: GET /catalog/products
[GiftapiSyncService] Starting GiftAPI catalog sync...
[GiftapiOrderService] Creating GiftAPI order: order-123 for SKU 019bc0dd-8562-7173-afd9-a5cc534fafb7
[GiftapiWebhookController] Received GiftAPI webhook: order.status_changed
```

## Тестирование

```bash
# Синхронизация
curl -X POST http://localhost:5000/api/giftapi/sync

# Получить категории
curl http://localhost:5000/api/giftapi/categories

# Получить товары по типу
curl http://localhost:5000/api/giftapi/type/voucher

# Получить прайс-лист
curl http://localhost:5000/api/giftapi/pricelist

# Создать заказ
curl -X POST http://localhost:5000/api/orders/giftapi/create \
  -H "Content-Type: application/json" \
  -d '{
    "skuId": "019bc0dd-8562-7173-afd9-a5cc534fafb7",
    "fields": { "quantity": 1 }
  }'
```
