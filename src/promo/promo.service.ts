import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PromoCodeScope } from '@prisma/client';
import {
  ApplyPromoCodeDto,
  PromoCodeCreateDto,
  PromoCodeUpdateDto,
  PromoTarget,
} from './dto/promo.dto';

@Injectable()
export class PromoService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    return this.prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { uses: true } },
      },
    });
  }

  async getById(id: string) {
    const promo = await this.prisma.promoCode.findUnique({
      where: { id },
      include: {
        uses: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            order: { select: { id: true, total: true, createdAt: true } },
            steamOrder: { select: { id: true, total: true, createdAt: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!promo) throw new NotFoundException('Промокод не найден');
    return promo;
  }

  private validatePromoTarget(scope: PromoCodeScope, target: PromoTarget) {
    if (scope === PromoCodeScope.GAMES_ONLY && target === PromoTarget.STEAM) {
      throw new BadRequestException(
        'Этот промокод доступен только для обычных игр',
      );
    }

    if (scope === PromoCodeScope.STEAM_ONLY && target === PromoTarget.GAME) {
      throw new BadRequestException('Этот промокод доступен только для Steam');
    }
  }

  private async validatePromo(
    code: string,
    userId: string,
    target: PromoTarget,
  ) {
    const promo = await this.prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!promo || !promo.isActive) {
      throw new BadRequestException('Промокод не найден или неактивен');
    }

    if (promo.expiresAt && promo.expiresAt < new Date()) {
      throw new BadRequestException('Срок действия промокода истёк');
    }

    this.validatePromoTarget(promo.scope, target);

    if (promo.usageLimit !== null) {
      const useCount = await this.prisma.promoCodeUse.count({
        where: { promoCodeId: promo.id },
      });

      if (useCount >= promo.usageLimit) {
        throw new BadRequestException('Промокод больше недействителен');
      }
    }

    const alreadyUsed = await this.prisma.promoCodeUse.findFirst({
      where: { promoCodeId: promo.id, userId },
    });

    if (alreadyUsed) {
      throw new BadRequestException('Вы уже использовали этот промокод');
    }

    return promo;
  }

  async check(
    code: string,
    userId: string,
    target: PromoTarget = PromoTarget.GAME,
  ) {
    const promo = await this.validatePromo(code, userId, target);

    return {
      code: promo.code,
      discount: Number(promo.discount),
      scope: promo.scope,
    };
  }

  async create(dto: PromoCodeCreateDto) {
    const existing = await this.prisma.promoCode.findUnique({
      where: { code: dto.code.toUpperCase() },
    });

    if (existing) throw new BadRequestException('Промокод уже существует');

    return this.prisma.promoCode.create({
      data: {
        code: dto.code.toUpperCase(),
        discount: dto.discount,
        scope: dto.scope ?? PromoCodeScope.ALL,
        isActive: dto.isActive ?? true,
        usageLimit: dto.usageLimit ?? null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });
  }

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
        ...(dto.scope !== undefined && { scope: dto.scope }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.usageLimit !== undefined && { usageLimit: dto.usageLimit }),
        ...(dto.expiresAt !== undefined && {
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        }),
      },
    });
  }

  async delete(id: string) {
    await this.getById(id);
    return this.prisma.promoCode.delete({ where: { id } });
  }

  async apply(dto: ApplyPromoCodeDto, userId: string) {
    const target = dto.target ?? PromoTarget.GAME;
    const promo = await this.validatePromo(dto.code, userId, target);

    return {
      id: promo.id,
      code: promo.code,
      discount: promo.discount,
      scope: promo.scope,
    };
  }

  async markUsed(promoCodeId: string) {
    await this.prisma.promoCode.update({
      where: { id: promoCodeId },
      data: { usageCount: { increment: 1 } },
    });
  }
}
