# GiftAPI Integration Changelog

## Version 1.0.0 - Initial Integration (2026-07-22)

### Added

#### Core Services
- **GiftapiService** - Base service for GiftAPI HTTP requests with authentication
  - Partner info and balance endpoints
  - Product catalog management
  - Order creation with HMAC-SHA256 signing
  - Webhook signature verification
  - eSIM operations

- **GiftapiSyncService** - Catalog synchronization
  - Full catalog sync from GiftAPI
  - Product and SKU management
  - Category browsing
  - Pricelist retrieval

- **GiftapiOrderService** - Order processing
  - Order creation and status tracking
  - Webhook event handling
  - Delivery data management
  - eSIM top-up support

#### Controllers
- **GiftapiCatalogController**
  - `POST /giftapi/sync` - Sync catalog
  - `GET /giftapi/categories` - List categories
  - `GET /giftapi/category/:category` - Get products by category
  - `GET /giftapi/type/:type` - Get products by type
  - `GET /giftapi/pricelist` - Get pricelist
  - `GET /giftapi/sku/:skuId` - Get product by SKU

- **GiftapiWebhookController**
  - `POST /giftapi/webhooks/order-status` - Handle order status webhooks
  - `POST /giftapi/webhooks/health` - Health check

#### Updated Components
- **OrderService** - Added `createGiftapiOrder()` method
- **OrderController** - Added `POST /orders/giftapi/create` endpoint
- **OrderModule** - Imported GiftapiModule
- **AppModule** - Registered GiftapiModule

#### Database
- **GiftApiProduct** model for catalog storage
- Order table extensions for GiftAPI tracking

#### Configuration
- Environment variables: GIFTAPI_BASE_URL, GIFTAPI_TOKEN, GIFTAPI_SECRET
- Bootstrap logging for GiftAPI status

### Features

#### Product Management
- Full product catalog synchronization
- Support for all GiftAPI product types (voucher, recharge, eSIM, etc.)
- Automatic inventory tracking
- Price and markup calculation

#### Order Processing
- Direct GiftAPI order creation
- HMAC-SHA256 signature authentication
- Order status tracking via webhooks
- Delivery data retrieval (PIN codes, eSIM data, etc.)

#### Webhook Handling
- Signature verification
- Idempotency key tracking
- Automatic order status updates
- Error retry handling

#### eSIM Support
- eSIM profile delivery
- Top-up operations
- Status tracking
- Coverage information

### Integration Points

#### With Existing Systems
- YooKassa integration remains unchanged
- Payment flow: User → YooKassa → Order Created → GiftAPI Delivery
- Promo codes still work with GiftAPI orders
- User authentication unchanged

### Documentation
- Comprehensive integration guide (GIFTAPI_INTEGRATION.md)
- API endpoint documentation
- Example usage patterns
- Troubleshooting guide
- Setup scripts

### Testing
- Sample API calls with curl
- Environment configuration examples
- Webhook signature verification

---

## Migration Guide from Previous Version

1. Add GiftAPI env variables to `.env`
2. Run database migrations to add GiftApiProduct table
3. Run `POST /giftapi/sync` to populate catalog
4. Update frontend to use new `/orders/giftapi/create` endpoint
5. Configure GiftAPI webhook URL in partner settings

---

## Known Limitations

- Steam orders not yet migrated to GiftAPI (will be done in v2.0)
- Custom denomination products require specific field formats
- Rate limiting follows GiftAPI's server limits

---

## Next Steps

- [ ] Migrate Steam orders to GiftAPI
- [ ] Add order fulfillment tracking dashboard
- [ ] Implement automatic catalog refresh
- [ ] Add advanced filtering and search
- [ ] Create admin management interface
- [ ] Add support for multi-currency pricing
