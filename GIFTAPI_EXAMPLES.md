# GiftAPI Integration Examples

## Quick Start

### 1. Setup Environment

```bash
# Copy environment template
cp .env.giftapi.example .env

# Update with your credentials
GIFTAPI_BASE_URL=https://api.giftapi.io/v1/partner
GIFTAPI_TOKEN=your_s2s_token
GIFTAPI_SECRET=your_partner_secret
```

### 2. Run Setup Script

```bash
chmod +x scripts/setup-giftapi.sh
./scripts/setup-giftapi.sh
```

### 3. Sync Catalog

```bash
curl -X POST http://localhost:5000/api/giftapi/sync
```

---

## API Usage Examples

### Get Available Categories

```bash
curl http://localhost:5000/api/giftapi/categories
```

**Response:**
```json
{
  "success": true,
  "data": [
    "Apple",
    "Google Play",
    "PlayStation",
    "Steam",
    "Uber",
    "Netflix",
    "Spotify"
  ]
}
```

### Get Products by Category

```bash
curl http://localhost:5000/api/giftapi/category/Apple
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "giftapi_019bc0dd-8434-7246-a0fa-a8a29b88eeee",
      "giftapiProductId": "019bc0dd-8423-739c-a557-5387d900152b",
      "giftapiSkuId": "019bc0dd-8434-7246-a0fa-a8a29b88eeee",
      "name": "$2 Apple Gift Card",
      "type": "voucher",
      "denominationType": "fixed",
      "price": 2.2,
      "currency": "USD",
      "stock": 100,
      "maxPerOrder": 1,
      "category": "Digital Content"
    },
    {
      "id": "giftapi_019bc0dd-844e-726d-af0a-24187668feef",
      "giftapiProductId": "019bc0dd-8423-739c-a557-5387d900152b",
      "giftapiSkuId": "019bc0dd-844e-726d-af0a-24187668feef",
      "name": "$3 Apple Gift Card",
      "type": "voucher",
      "denominationType": "fixed",
      "price": 3.3,
      "currency": "USD",
      "stock": 50,
      "maxPerOrder": 1,
      "category": "Digital Content"
    }
  ]
}
```

### Get Products by Type

```bash
curl http://localhost:5000/api/giftapi/type/voucher
```

### Get Pricelist

```bash
curl http://localhost:5000/api/giftapi/pricelist
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "giftapiSkuId": "019bc0dd-8434-7246-a0fa-a8a29b88eeee",
      "name": "$2 Apple Gift Card",
      "price": 2.2,
      "currency": "USD",
      "stock": 100,
      "denominationType": "fixed"
    }
  ]
}
```

### Get Product by SKU

```bash
curl http://localhost:5000/api/giftapi/sku/019bc0dd-8434-7246-a0fa-a8a29b88eeee
```

---

## Creating Orders

### Create GiftAPI Order (Frontend User)

```bash
curl -X POST http://localhost:5000/api/orders/giftapi/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{
    "skuId": "019bc0dd-8434-7246-a0fa-a8a29b88eeee",
    "fields": {
      "quantity": 1
    }
  }'
```

**Response (Immediate):**
```json
{
  "success": true,
  "data": {
    "orderId": "550e8400-e29b-41d4-a716-446655440000",
    "giftapiOrderId": "12161770-8560-4377-9795-e8a70aaceb07",
    "status": "completed",
    "items": [
      {
        "sku_id": "019bc0dd-8434-7246-a0fa-a8a29b88eeee",
        "sku_name": "$2 Apple Gift Card",
        "quantity": 1,
        "price": 2.2,
        "currency": "USD",
        "status": "completed",
        "delivery_data": [
          {
            "pin": "ABCD-EFGH-IJKL-MNOP",
            "serial_number": "VOUCHER123456",
            "expiration_date": "2027-01-15"
          }
        ]
      }
    ]
  }
}
```

### Create Order with Custom Denomination (Top-up)

```bash
curl -X POST http://localhost:5000/api/orders/giftapi/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{
    "skuId": "019cd67c-eed8-7285-8cba-9ddc1e2a4122",
    "fields": {
      "amount": 50,
      "phone": "+79991234567"
    }
  }'
```

---

## Frontend Integration Examples

### React Component Example

```typescript
import { useState, useEffect } from 'react';

interface Product {
  giftapiSkuId: string;
  name: string;
  price: number;
  currency: string;
  stock: number;
}

export function GiftapiShop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('Apple');

  useEffect(() => {
    fetchProducts();
  }, [category]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/giftapi/category/${encodeURIComponent(category)}`
      );
      const data = await res.json();
      setProducts(data.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (product: Product) => {
    try {
      const res = await fetch('/api/orders/giftapi/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          skuId: product.giftapiSkuId,
          fields: { quantity: 1 },
        }),
      });

      if (!res.ok) throw new Error('Order creation failed');

      const order = await res.json();
      console.log('Order created:', order.data);

      // Show delivery data
      if (order.data.items[0].delivery_data) {
        const delivery = order.data.items[0].delivery_data[0];
        alert(`PIN: ${delivery.pin}`);
      }
    } catch (error) {
      console.error('Order creation failed:', error);
    }
  };

  return (
    <div>
      <h1>GiftAPI Shop</h1>
      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        <option>Apple</option>
        <option>Google Play</option>
        <option>PlayStation</option>
        <option>Steam</option>
      </select>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="products-grid">
          {products.map((product) => (
            <div key={product.giftapiSkuId} className="product-card">
              <h3>{product.name}</h3>
              <p>Price: ${product.price}</p>
              <p>Stock: {product.stock}</p>
              <button onClick={() => createOrder(product)}>Buy Now</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Vue.js Example

```vue
<template>
  <div class="giftapi-shop">
    <h1>GiftAPI Shop</h1>
    <select v-model="selectedCategory">
      <option>Apple</option>
      <option>Google Play</option>
      <option>PlayStation</option>
    </select>

    <div v-if="loading">Loading...</div>
    <div v-else class="products">
      <div
        v-for="product in products"
        :key="product.giftapiSkuId"
        class="product"
      >
        <h3>{{ product.name }}</h3>
        <p>{{ product.price }} {{ product.currency }}</p>
        <p>Stock: {{ product.stock }}</p>
        <button @click="createOrder(product)">Buy</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface Product {
  giftapiSkuId: string;
  name: string;
  price: number;
  currency: string;
  stock: number;
}

const selectedCategory = ref('Apple');
const products = ref<Product[]>([]);
const loading = ref(false);

watch(selectedCategory, () => {
  fetchProducts();
});

const fetchProducts = async () => {
  loading.value = true;
  try {
    const res = await fetch(
      `/api/giftapi/category/${encodeURIComponent(selectedCategory.value)}`
    );
    const data = await res.json();
    products.value = data.data;
  } finally {
    loading.value = false;
  }
};

const createOrder = async (product: Product) => {
  try {
    const res = await fetch('/api/orders/giftapi/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        skuId: product.giftapiSkuId,
        fields: { quantity: 1 },
      }),
    });

    const order = await res.json();
    if (order.success) {
      alert(`Order created! PIN: ${order.data.items[0].delivery_data[0].pin}`);
    }
  } catch (error) {
    console.error('Order creation failed:', error);
  }
};

fetchProducts();
</script>
```

---

## Backend Service Usage

### Inject and Use GiftAPI Services

```typescript
import { Injectable } from '@nestjs/common';
import { GiftapiSyncService } from 'src/giftapi/giftapi-sync.service';
import { GiftapiOrderService } from 'src/giftapi/giftapi-order.service';

@Injectable()
export class MyService {
  constructor(
    private giftapiSync: GiftapiSyncService,
    private giftapiOrder: GiftapiOrderService,
  ) {}

  async getAllProducts() {
    return this.giftapiSync.getAllCategories();
  }

  async getProductsByCategory(category: string) {
    return this.giftapiSync.getProductsByCategory(category);
  }

  async createOrder(orderId: string, skuId: string) {
    return this.giftapiOrder.createOrder(
      orderId,
      skuId,
      { quantity: 1 },
    );
  }
}
```

---

## Webhook Handling

GiftAPI will POST to `/api/giftapi/webhooks/order-status` when order status changes.

**Webhook Payload Example:**

```json
{
  "event": "order.status_changed",
  "timestamp": "2026-01-15T12:58:23+00:00",
  "idempotency_key": "550e8400-e29b-41d4-a716-446655440000",
  "data": {
    "order": {
      "id": "12161770-8560-4377-9795-e8a70aaceb07",
      "external_id": "order-550e8400-e29b-41d4-a716-446655440000",
      "status": "completed",
      "total_amount": 2.2,
      "currency": "USD",
      "items": [
        {
          "sku_id": "019bc0dd-8434-7246-a0fa-a8a29b88eeee",
          "quantity": 1,
          "price": 2.2,
          "status": "completed",
          "delivery_data": [
            {
              "pin": "ABCD-EFGH-IJKL-MNOP",
              "serial_number": "VOUCHER123456"
            }
          ]
        }
      ]
    }
  }
}
```

**Headers Sent by GiftAPI:**
```
X-Timestamp: 1705321103
X-Signature: 13fbd7a9a501ea39aeec861a27158dfa00c491aa657798adac8ed9b2066a6fa2
```

The system automatically:
1. Verifies the signature
2. Finds the corresponding order in your DB
3. Updates order status
4. Stores delivery data (PIN codes, eSIM profiles, etc.)

---

## eSIM Example

### Get eSIM Status

```bash
curl http://localhost:5000/api/services/esim/8944422711108338982/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "esim_id": "6c4045e5-e041-400e-ada1-b5320e20f01d",
    "iccid": "8944422711108338982",
    "status": "Installed",
    "qr_code": "LPA:1$rsp-3104.idemia.io$ABC-123-DEF",
    "can_renew": true,
    "data_balance": {
      "total_gb": 10,
      "remaining_gb": 8.5,
      "unit": "GB"
    },
    "coverage": [
      {
        "country_name": "United Arab Emirates",
        "country_code": "AE",
        "network_name": "Etisalat"
      }
    ]
  }
}
```

### Top-up eSIM

```typescript
const topupResponse = await this.giftapiOrder.topupEsim(
  orderId,
  '8944422711108338982', // ICCID
  'sku-id-for-10gb-package' // optional
);
```

---

## Error Handling

### Common Errors

```json
{
  "success": false,
  "error": "SKU {skuId} not found in catalog. Please sync catalog first."
}
```

**Solution:** Run `POST /api/giftapi/sync` first

```json
{
  "success": false,
  "error": "SKU {skuId} is out of stock"
}
```

**Solution:** Choose a different SKU

```json
{
  "success": false,
  "error": "GiftAPI Error: Insufficient balance"
}
```

**Solution:** Check partner balance in GiftAPI account

---

## Monitoring

### Check GiftAPI Balance

```typescript
const balance = await this.giftapiService.getBalance();
console.log(`Available: $${balance.available_balance}`);
console.log(`Overdraft: $${balance.overdraft_limit}`);
```

### View Transaction History

```typescript
const history = await this.giftapiService.getBalanceHistory();
history.data.forEach(transaction => {
  console.log(`${transaction.type}: ${transaction.amount} ${transaction.currency}`);
});
```

---

## Troubleshooting

### "GiftAPI env variables are not defined"

✅ **Fix:**
```bash
echo "GIFTAPI_BASE_URL=https://api.giftapi.io/v1/partner" >> .env
echo "GIFTAPI_TOKEN=your_token" >> .env
echo "GIFTAPI_SECRET=your_secret" >> .env
```

### "Invalid signature"

✅ **Fix:**
1. Verify `GIFTAPI_SECRET` is correct (not the token!)
2. Check timestamp is within ±5 minutes of server time
3. Ensure fields are in correct order: `timestamp + skuId + externalId`

### Orders not being created

✅ **Fix:**
1. Sync catalog first: `POST /api/giftapi/sync`
2. Check SKU exists: `GET /api/giftapi/sku/{skuId}`
3. Verify stock is > 0
4. Check balance: `GET /api/giftapi/balance` (if available)

---

## Performance Tips

1. **Cache categories** - They don't change often
2. **Batch webhook processing** - Queue order updates
3. **Async sync** - Sync catalog during off-peak hours
4. **Index GiftAPI fields** - Already done in migrations
5. **Paginate results** - Use cursor pagination for large catalogs

---

## Support

- 📖 **Docs:** https://docs.giftapi.ru/
- 🐛 **Issues:** Check logs in `/src/giftapi/*.service.ts`
- 💬 **Debug:** Enable verbose logging in ConfigService
