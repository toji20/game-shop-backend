# GiftAPI Integration - Implementation Guide

## 📋 Краткое Резюме Изменений

Вся интеграция находится в ветке `giftapi-integration`. Это полная реализация поддержки GiftAPI для:
- ✅ Каталога товаров
- ✅ Создания заказов
- ✅ Обработки вебхуков
- ✅ eSIM операций
- ✅ Отслеживания статуса

**YooKassa НЕ изменена** - платежная система остается прежней!

---

## 🚀 Как Внести Изменения в Проект

### Вариант 1: Merge Ветки (Рекомендуется)

```bash
# 1. Перейти в главную ветку
git checkout main

# 2. Обновить локальный репо
git fetch origin

# 3. Merge ветку с GiftAPI
git merge origin/giftapi-integration

# 4. Если есть конфликты - решить их
# 5. Сделать коммит
git commit -m "Merge GiftAPI integration"

# 6. Запушить в удаленный репо
git push origin main
```

### Вариант 2: Cherry-pick Отдельных Коммитов

```bash
# Посмотреть все коммиты в ветке
git log main..origin/giftapi-integration

# Выбрать нужные коммиты
git cherry-pick <commit-hash>
```

### Вариант 3: Создать Pull Request (Через GitHub)

1. Откройте https://github.com/toji20/game-shop-backend
2. Нажмите **"Pull requests"**
3. Нажмите **"New pull request"**
4. Base: `main` ← Compare: `giftapi-integration`
5. Нажмите **"Create pull request"**
6. Отредактируйте описание
7. Нажмите **"Merge pull request"**

---

## 📝 Необходимые Шаги После Merge

### 1️⃣ Обновить Prisma Schema

```bash
# Копируем новые поля в основной schema.prisma
# Из prisma/schema-giftapi-additions.prisma

# Добавьте в модель Order:
model Order {
  // ... существующие поля ...
  
  // GiftAPI fields
  giftapiOrderId        String?
  giftapiExternalId     String?   @unique
  giftapiStatus         String?
  giftapiDeliveryData   Json?
  giftapiProductId      String?
}

# Добавьте новую модель:
model GiftApiProduct {
  id                    String   @id
  giftapiProductId      String   @unique
  giftapiSkuId          String   @unique
  name                  String
  description           String?
  type                  String
  denominationType      String
  category              String
  price                 Decimal? @db.Decimal(10, 2)
  currency              String   @default("USD")
  stock                 Int      @default(0)
  maxPerOrder           Int      @default(1)
  attributes            Json?
  image                 String?
  syncedAt              DateTime @updatedAt
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  deletedAt             DateTime?

  @@index([giftapiSkuId])
  @@index([giftapiProductId])
  @@index([type])
  @@index([category])
}
```

### 2️⃣ Создать Prisma Миграцию

```bash
# Создать миграцию
npx prisma migrate dev --name add_giftapi_support

# Это создаст файл миграции и применит изменения
```

### 3️⃣ Добавить Переменные Окружения

```bash
# В файл .env добавьте:
echo "
# GiftAPI Configuration
GIFTAPI_BASE_URL=https://api.giftapi.io/v1/partner
GIFTAPI_TOKEN=your_s2s_token_here
GIFTAPI_SECRET=your_partner_secret_here
" >> .env
```

### 4️⃣ Переустановить Зависимости

```bash
# На случай если были добавлены новые пакеты
npm install
```

### 5️⃣ Запустить Приложение

```bash
# Запустить development сервер
npm run start:dev

# Или production сборка
npm run build
npm run start
```

### 6️⃣ Синхронизировать Каталог

```bash
# Запустить миграцию каталога
curl -X POST http://localhost:5000/api/giftapi/sync

# Или через скрипт (если используете Node)
node -e "require('./scripts/setup-giftapi.sh')"
```

---

## 📂 Структура Добавленных Файлов

```
src/
├── giftapi/
│   ├── giftapi.service.ts           ← Основной сервис API
│   ├── giftapi-sync.service.ts      ← Синхронизация каталога
│   ├── giftapi-order.service.ts     ← Управление заказами
│   ├── giftapi-module.ts            ← DI модуль
│   ├── giftapi-catalog.controller.ts ← API для каталога
│   ├── giftapi-webhook.controller.ts ← Обработка вебхуков
│   └── dto/
│       └── giftapi-product.dto.ts   ← DTO для типов
├── order/
│   ├── order.service.ts             ✏️ ОБНОВЛЕН (добавлена поддержка GiftAPI)
│   ├── order.controller.ts          ✏️ ОБНОВЛЕН (новый endpoint)
│   └── order.module.ts              ✏️ ОБНОВЛЕН (импорт GiftapiModule)
└── app.module.ts                     ✏️ ОБНОВЛЕН (регистрация GiftapiModule)

prisma/
├── schema.prisma                     ✏️ ОБНОВЛЕНА (новые модели)
├── migrations/
│   └── add_giftapi_support/          ← Новая миграция
└── schema-giftapi-additions.prisma   ← Справка с изменениями

scripts/
└── setup-giftapi.sh                  ← Setup скрипт

.env.giftapi.example                  ← Пример конфигурации
GIFTAPI_INTEGRATION.md                ← Полная документация
GIFTAPI_EXAMPLES.md                   ← Примеры использования
GIFTAPI_CHANGELOG.md                  ← История изменений
```

---

## ✅ Проверочный Список

- [ ] Merge ветку `giftapi-integration` в `main`
- [ ] Обновить `prisma/schema.prisma` с новыми моделями
- [ ] Запустить `npx prisma migrate dev --name add_giftapi_support`
- [ ] Добавить в `.env` переменные GiftAPI (GIFTAPI_BASE_URL, GIFTAPI_TOKEN, GIFTAPI_SECRET)
- [ ] Запустить `npm install`
- [ ] Запустить `npm run start:dev`
- [ ] Синхронизировать каталог: `curl -X POST http://localhost:5000/api/giftapi/sync`
- [ ] Протестировать endpoints: `GET /api/giftapi/categories`
- [ ] Создать тестовый заказ: `POST /api/orders/giftapi/create`
- [ ] Настроить webhook URL в панели GiftAPI

---

## 🔧 Важные Замечания

### ⚠️ Не Забудьте

1. **Получить credentials от GiftAPI:**
   - S2S Token
   - Partner Secret (НЕ путать с токеном!)
   - Base URL (production или sandbox)

2. **Настроить webhook в GiftAPI:**
   - URL: `https://your-domain.com/api/giftapi/webhooks/order-status`
   - GiftAPI будет отправлять сюда уведомления о статусе заказов

3. **Синхронизировать каталог:**
   - После первого запуска
   - Периодически (рекомендуется раз в день)
   - При обновлении ассортимента

### ✅ Совместимость

- **YooKassa:** ✅ Остается неизменной
- **Steam заказы:** ✅ Не затронуты (v2.0)
- **Существующие заказы:** ✅ Полная совместимость
- **Прямые ссылки на API:** ✅ Не изменены
- **WebSockets/Gateway:** ✅ Работают как прежде

---

## 🐛 Решение Проблем при Merge

### Конфликты в файлах

```bash
# Если есть конфликты, выполните:
git status  # Посмотреть конфликтующие файлы

# Обычно конфликты в:
# - src/app.module.ts
# - src/order/order.module.ts
# - src/order/order.service.ts

# Отредактируйте конфликты вручную (найдите <<<<<<< и >>>>>>>)
# Затем:
git add .
git commit -m "Resolve merge conflicts"
```

### Ошибка при миграции Prisma

```bash
# Если prisma не может создать миграцию:
npx prisma db push  # Force update DB schema

# Или создайте миграцию вручную:
npx prisma migrate resolve --rolled-back <migration-name>
```

---

## 📞 API Endpoints (После Merge)

### Каталог
- `GET /api/giftapi/sync` - Синхронизировать каталог
- `GET /api/giftapi/categories` - Все категории
- `GET /api/giftapi/category/:name` - Товары категории
- `GET /api/giftapi/type/:type` - Товары типа
- `GET /api/giftapi/pricelist` - Прайс-лист
- `GET /api/giftapi/sku/:skuId` - Товар по SKU

### Заказы
- `POST /api/orders/giftapi/create` - Создать заказ
- `POST /api/orders/place` - Старый endpoint (через YooKassa)
- `POST /api/orders/status` - Webhook от YooKassa

### Вебхуки
- `POST /api/giftapi/webhooks/order-status` - Webhook от GiftAPI
- `POST /api/giftapi/webhooks/health` - Health check

---

## 📚 Дополнительные Ресурсы

- 📖 [GIFTAPI_INTEGRATION.md](./GIFTAPI_INTEGRATION.md) - Полная документация
- 💻 [GIFTAPI_EXAMPLES.md](./GIFTAPI_EXAMPLES.md) - Примеры использования
- 📝 [GIFTAPI_CHANGELOG.md](./GIFTAPI_CHANGELOG.md) - История изменений
- 🌐 https://docs.giftapi.ru/ - Официальная документация GiftAPI

---

## ✨ После Успешного Merge

1. **Протестируйте каталог:**
   ```bash
   curl http://localhost:5000/api/giftapi/categories
   ```

2. **Создайте тестовый заказ:**
   ```bash
   curl -X POST http://localhost:5000/api/orders/giftapi/create \
     -H "Content-Type: application/json" \
     -d '{
       "skuId": "your-sku-id",
       "fields": {"quantity": 1}
     }'
   ```

3. **Обновите фронтенд:**
   - Используйте новый endpoint `/api/orders/giftapi/create`
   - Отображайте товары из `/api/giftapi/category/:name`
   - Показывайте delivery коды после успешного заказа

4. **Настройте мониторинг:**
   - Следите за логами GiftAPI сервиса
   - Проверяйте статусы заказов в БД
   - Убедитесь, что вебхуки приходят корректно

---

## 🎉 Готово!

После выполнения всех шагов ваше приложение будет готово работать с GiftAPI!

**Вопросы?** Обратитесь к документации в репозитории.
