import { Controller, Get, Post, Param, HttpCode, Logger } from '@nestjs/common';
import { GiftapiSyncService } from './giftapi-sync.service';
import { Auth } from 'src/auth/decorators/authorization.decorator';
import { CheckRole } from 'src/auth/decorators/check-role.decorator';
import { Role } from '@prisma/client';

@Controller('giftapi')
export class GiftapiCatalogController {
  private readonly logger = new Logger(GiftapiCatalogController.name);

  constructor(private readonly syncService: GiftapiSyncService) {}

  /**
   * Синхронизировать каталог из GiftAPI
   * POST /giftapi/sync
   */
  @Auth()
  @CheckRole(Role.ADMIN, Role.MANAGER)
  @Post('sync')
  @HttpCode(200)
  async syncCatalog() {
    this.logger.log('Syncing GiftAPI catalog...');
    return this.syncService.syncFullCatalog();
  }

  /**
   * Получить все категории товаров
   * GET /giftapi/categories
   */
  @Get('categories')
  async getCategories() {
    const categories = await this.syncService.getAllCategories();
    return {
      success: true,
      data: categories.map((c) => c.category),
    };
  }

  /**
   * Получить товары по категории
   * GET /giftapi/category/:category
   */
  @Get('category/:category')
  async getCategoryProducts(@Param('category') category: string) {
    const products = await this.syncService.getProductsByCategory(
      decodeURIComponent(category),
    );
    return {
      success: true,
      data: products,
    };
  }

  /**
   * Получить товары по типу
   * GET /giftapi/type/:type
   */
  @Get('type/:type')
  async getTypeProducts(@Param('type') type: string) {
    const products = await this.syncService.getProductsByType(type);
    return {
      success: true,
      data: products,
    };
  }

  /**
   * Получить прайс-лист
   * GET /giftapi/pricelist
   */
  @Get('pricelist')
  async getPricelist() {
    const pricelist = await this.syncService.getPricelist();
    return {
      success: true,
      data: pricelist,
    };
  }

  /**
   * Получить товар по SKU
   * GET /giftapi/sku/:skuId
   */
  @Get('sku/:skuId')
  async getSkuProduct(@Param('skuId') skuId: string) {
    const product = await this.syncService.getProductBySku(skuId);
    if (!product) {
      return {
        success: false,
        error: 'SKU not found',
      };
    }
    return {
      success: true,
      data: product,
    };
  }
}
