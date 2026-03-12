import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ApplyPromoCodeDto,
  PromoCodeCreateDto,
  PromoCodeUpdateDto,
} from './dto/promo.dto';

@Injectable()
export class PromoService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Получить все промокоды (для админа) ───────────────────────────────────
  async getAll() {
    return this.prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { uses: true } },
      },
    });
  }

  // ── Получить один промокод ─────────────────────────────────────────────────
  async getById(id: string) {
    const promo = await this.prisma.promoCode.findUnique({
      where: { id },
      include: {
        uses: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            order: { select: { id: true, total: true, createdAt: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!promo) throw new NotFoundException('Промокод не найден');
    return promo;
  }

  // ── Создать промокод ───────────────────────────────────────────────────────
  async create(dto: PromoCodeCreateDto) {
    const existing = await this.prisma.promoCode.findUnique({
      where: { code: dto.code.toUpperCase() },
    });

    if (existing) throw new BadRequestException('Промокод уже существует');

    return this.prisma.promoCode.create({
      data: {
        code: dto.code.toUpperCase(),
        discount: dto.discount,
        isActive: dto.isActive ?? true,
        usageLimit: dto.usageLimit ?? null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });
  }

  // ── Обновить промокод ──────────────────────────────────────────────────────
  async update(id: string, dto: PromoCodeUpdateDto) {
    await this.getById(id);

    if (dto.code) {
      const existing = await this.prisma.promoCode.findUnique({
        where: { code: dto.code.toUpperCase() },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException('Промокод с таким кодом уже существует');
      }
    }

    return this.prisma.promoCode.update({
      where: { id },
      data: {
        ...(dto.code && { code: dto.code.toUpperCase() }),
        ...(dto.discount !== undefined && { discount: dto.discount }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.usageLimit !== undefined && { usageLimit: dto.usageLimit }),
        ...(dto.expiresAt !== undefined && {
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        }),
      },
    });
  }

  // ── Удалить промокод ───────────────────────────────────────────────────────
  async delete(id: string) {
    await this.getById(id);
    return this.prisma.promoCode.delete({ where: { id } });
  }

  // ── Проверить и применить промокод (вызывается при оформлении заказа) ──────
  async apply(dto: ApplyPromoCodeDto, userId: string) {
    const promo = await this.prisma.promoCode.findUnique({
      where: { code: dto.code.toUpperCase() },
    });

    if (!promo || !promo.isActive) {
      throw new BadRequestException('Промокод не найден или неактивен');
    }

    // проверка срока действия
    if (promo.expiresAt && promo.expiresAt < new Date()) {
      throw new BadRequestException('Срок действия промокода истёк');
    }

    // проверка лимита использований
    if (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit) {
      throw new BadRequestException('Промокод больше недействителен');
    }

    // проверка что пользователь ещё не использовал
    const alreadyUsed = await this.prisma.promoCodeUse.findFirst({
      where: { promoCodeId: promo.id, userId },
    });

    if (alreadyUsed) {
      throw new BadRequestException('Вы уже использовали этот промокод');
    }

    // возвращаем промокод — скидка применяется на фронте/в заказе
    return {
      id: promo.id,
      code: promo.code,
      discount: promo.discount,
    };
  }

  // ── Зафиксировать использование промокода (вызывается после оплаты) ────────
  async markUsed(promoCodeId: string, userId: string, orderId: string) {
    await this.prisma.$transaction([
      this.prisma.promoCodeUse.create({
        data: { promoCodeId, userId, orderId },
      }),
      this.prisma.promoCode.update({
        where: { id: promoCodeId },
        data: { usageCount: { increment: 1 } },
      }),
    ]);
  }
}
