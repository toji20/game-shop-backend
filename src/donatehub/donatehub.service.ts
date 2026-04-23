/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DonateHubService {
  constructor(
    private readonly http: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  private get headers() {
    const token = process.env.DONATEHUB_TOKEN;
    if (!token) throw new NotFoundException();
    return {
      Authorization: `TOKEN ${token}`,
    };
  }

  async getGames() {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${process.env.DONATEHUB_URL}`, {
          headers: this.headers,
        }),
      );
      return data;
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.warn(`Игра недоступна: ${error.response.data.error_message}`);
        return null;
      }
      throw error;
    }
  }

  async getGameById(id: number) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${process.env.DONATEHUB_URL}/${id}`, {
          headers: this.headers,
        }),
      );
      return data;
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.warn(
          `Игра ${id} недоступна: ${error.response.data.error_message}`,
        );
        return null;
      }
      throw error;
    }
  }
}
