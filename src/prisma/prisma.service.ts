import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const createPrismaClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    }),
  }).$extends({
    result: {
      position: {
        finalPrice: {
          needs: { myPrice: true, discount: true },
          compute(p) {
            const price = Number(p.myPrice);
            const disc = Number(p.discount);
            return disc > 0 ? +(price * (1 - disc / 100)).toFixed(2) : price;
          },
        },
      },
    },
  });

type PrismaClientExtended = ReturnType<typeof createPrismaClient>;

@Injectable()
export class PrismaService implements OnModuleInit {
  private readonly client: PrismaClientExtended;

  constructor() {
    this.client = createPrismaClient();
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  get position() {
    return this.client.position;
  }
  get game() {
    return this.client.game;
  }
  get order() {
    return this.client.order;
  }
  get orderItem() {
    return this.client.orderItem;
  }
  get user() {
    return this.client.user;
  }
  get review() {
    return this.client.review;
  }
  get banner() {
    return this.client.banner;
  }
  get promoCode() {
    return this.client.promoCode;
  }
  get promoCodeUse() {
    return this.client.promoCodeUse;
  }
  get adBanner() {
    return this.client.adBanner;
  }
  get steamOrder() {
    return this.client.steamOrder;
  }
  get gameField() {
    return this.client.gameField;
  }
  get category() {
    return this.client.category;
  }
  get gameServer() {
    return this.client.gameServer;
  }
}
