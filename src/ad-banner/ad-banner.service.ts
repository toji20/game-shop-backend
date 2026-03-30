import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdBannerDto } from './dto/ad-banner.dto';

@Injectable()
export class AdBannerService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    const adbanners = await this.prisma.adBanner.findMany({});
    if (!adbanners) {
      throw new NotFoundException({
        message: 'Баннеры не найдены',
      });
    }
    return adbanners;
  }

  async getById(id: number) {
    const adbanner = await this.prisma.adBanner.findUnique({
      where: {
        id: Number(id),
      },
    });
    if (!adbanner) {
      throw new NotFoundException({
        message: 'Баннер не найден',
      });
    }
    return adbanner;
  }

  async getAllActive() {
    const adbanners = await this.prisma.adBanner.findMany({
      where: {
        isActive: true,
      },
    });
    if (!adbanners) {
      throw new NotFoundException({
        message: 'Баннеры не найдены',
      });
    }
    return adbanners;
  }

  async create(dto: AdBannerDto) {
    return this.prisma.adBanner.create({
      data: {
        image: dto.image,
        title: dto.title || '',
        description: dto.description || '',
        link: dto.link || '',
        isActive: dto.isActive,
      },
    });
  }

  async update(dto: AdBannerDto, id: number) {
    await this.getById(id);
    return this.prisma.adBanner.update({
      where: {
        id: Number(id),
      },
      data: {
        image: dto.image,
        title: dto.title || '',
        description: dto.description || '',
        link: dto.link || '',
        isActive: dto.isActive,
      },
    });
  }

  async delete(id: number) {
    await this.getById(id);
    return this.prisma.adBanner.delete({
      where: {
        id: Number(id),
      },
    });
  }
}
