import { Injectable, Logger } from '@nestjs/common';
import { GiftapiService } from './giftapi.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GiftapiSyncService {
  private readonly logger = new Logger(GiftapiSyncService.name);

  constructor(
    private readonly giftapi: GiftapiService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Синхронизировать весь каталог продуктов из GiftAPI
   * Рекомендуется запускать 1 раз в день
   */
  async syncFullCatalog() {
    this.logger.log('Starting GiftAPI catalog sync...');
    let cursor: string | undefined;
    let totalProducts = 0;
    let totalSkus = 0;

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const response = await this.giftapi.getProducts({
          locale: 'en',
          cursor,
          perPage: 100,
          includeSKUs: true,
        });

        if (!response.success || !response.data || response.data.length === 0) {
          break;
        }

        for (const product of response.data) {
          await this.syncProduct(product);
          totalProducts++;

          if (product.skus && Array.isArray(product.skus)) {
            totalSkus += product.skus.length;
          }
        }

        cursor = response.meta?.next_cursor;
        if (!cursor) break;
      }

      this.logger.log(
        `GiftAPI catalog sync completed: ${totalProducts} products, ${totalSkus} SKUs`,
      );
      return { success: true, totalProducts, totalSkus };
    } catch (error) {
      this.logger.error('GiftAPI catalog sync failed:', error);
      throw error;
    }
  }

  /**
   * Синхронизировать один продукт с его SKU
   */
  private async syncProduct(product: any) {
    try {
      if (!product.skus || product.skus.length === 0) {
        this.logger.warn(`Product ${product.id} has no SKUs, skipping...`);
        return;
      }

      // Для каждого SKU создаем отдельную запись в БД
      for (const sku of product.skus) {
        await this.syncSku(product, sku);
      }
    } catch (error) {
      this.logger.error(`Failed to sync product ${product.id}:`, error);
    }
  }

  /**
   * Синхронизировать один SKU продукта
   */
  private async syncSku(product: any, sku: any) {
    const id = `giftapi_${sku.id}`;

    const data = {
      giftapiProductId: product.id,
      giftapiSkuId: sku.id,
      name: sku.name || product.name,
      description: product.description,
      type: product.type,
      denominationType: product.denomination_type,
      category: product.category?.name || 'Other',
      price: sku.price || null,
      currency: sku.currency || 'USD',
      stock: sku.stock || 0,
      maxPerOrder: sku.max_per_order || 1,
      attributes: {
        productAttributes: product.attributes || {},
        skuAttributes: sku.attributes || {},
        fields: product.fields || [],
      },
      image: sku.image || product.image || '',
      syncedAt: new Date(),
    };

    try {
      await this.prisma.giftApiProduct.upsert({
        where: { id },
        update: data,
        create: {
          id,
          ...data,
        },
      });

      this.logger.debug(`Synced SKU: ${sku.id} (${sku.name})`);
    } catch (error) {
      this.logger.error(`Failed to sync SKU ${sku.id}:`, error);
    }
  }

  /**
   * Получить продукты по категории
   */
  async getProductsByCategory(category: string) {
    return this.prisma.giftApiProduct.findMany({
      where: {
        category,
        deletedAt: null,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Получить все доступные категории
   */
  async getAllCategories() {
    return this.prisma.giftApiProduct.findMany({
      where: { deletedAt: null },
      distinct: ['category'],
      select: { category: true },
    });
  }

  /**
   * Получить продукт по GiftAPI SKU ID
   */
  async getProductBySku(skuId: string) {
    return this.prisma.giftApiProduct.findUnique({
      where: { giftapiSkuId: skuId },
    });
  }

  /**
   * Получить продукт по типу
   */
  async getProductsByType(type: string) {
    return this.prisma.giftApiProduct.findMany({
      where: {
        type,
        deletedAt: null,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Получить цены на товары
   */
  async getPricelist() {
    return this.prisma.giftApiProduct.findMany({
      where: { deletedAt: null },
      select: {
        giftapiSkuId: true,
        name: true,
        price: true,
        currency: true,
        stock: true,
        denominationType: true,
      },
    });
  }
}
