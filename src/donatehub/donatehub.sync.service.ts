import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { DonateHubService } from './donatehub.service';

@Injectable()
export class DonateHubSyncService {
  constructor(
    private prisma: PrismaService,
    private donateHub: DonateHubService,
  ) {}

  async syncAllGames() {
    console.log('=== Старт синхронизации всех игр ===');

    const games = await this.donateHub.getGames();

    // Диагностика структуры данных
    console.log('Тип games:', typeof games);
    console.log('Является массивом:', Array.isArray(games));

    if (!games) {
      console.log('Нет игр для синхронизации');
      return;
    }

    let gamesArray: any[] = [];

    if (Array.isArray(games)) {
      gamesArray = games;
    } else if (games && typeof games === 'object') {
      const values = Object.values(games);

      if (values.length === 1 && Array.isArray(values[0])) {
        gamesArray = values[0];
      } else if (
        values.length > 0 &&
        values[0] &&
        typeof values[0] === 'object'
      ) {
        const hasIdFields = values.some(
          (item) => item && typeof item === 'object' && 'id' in item,
        );

        if (hasIdFields) {
          gamesArray = values;
        } else {
          gamesArray = values
            .flatMap((item) =>
              item && typeof item === 'object' ? Object.values(item) : [],
            )
            .filter((game) => game && typeof game === 'object' && 'id' in game);
        }
      } else {
        gamesArray = values;
      }
    }

    gamesArray = gamesArray.filter(
      (game) => game && typeof game === 'object' && game.id && game.name,
    );

    console.log(`Всего игр для обработки: ${gamesArray.length}`);

    for (const gameSummary of gamesArray) {
      console.log('Обрабатываем игру:', gameSummary.id, gameSummary.name);

      try {
        const gameDetails = await this.donateHub.getGameById(gameSummary.id);

        if (!gameDetails) {
          console.log(`Пропускаем недоступную игру ${gameSummary.id}`);
          continue;
        }

        console.log(
          ` Получены детали игры ${gameDetails.id}: ${gameDetails.name}`,
        );
        await this.syncGame(gameDetails);
      } catch (error) {
        console.error(
          `Ошибка при синхронизации игры ${gameSummary.id}:`,
          error.message || error,
        );
      }
    }

    console.log('=== Синхронизация всех игр завершена ===');
  }

  private async syncGame(game: any) {
    console.log(
      '=== syncGame: Начало синхронизации игры ===',
      game.id,
      game.name,
    );

    const dbGame = await this.prisma.game.upsert({
      where: { donateHubId: game.id },
      update: {
        name: game.name,
        discount: game.discount || 0,
      },
      create: {
        donateHubId: game.id,
        name: game.name,
        slug: this.slugify(game.name),
        discount: game.discount || 0,
      },
    });

    console.log('Игра синхронизирована в БД:', dbGame.id, dbGame.name);

    await this.syncFields(dbGame.id, game.fields || []);
    await this.syncServers(dbGame.id, game.servers || {});
    await this.syncPositions(dbGame.id, game.positions || {});

    console.log('=== syncGame: Завершена синхронизация игры ===', game.id);
  }

  private async syncFields(gameId: number, fields: string[]) {
    console.log(`Синхронизация ${fields.length} полей для игры ${gameId}`);

    await this.prisma.gameField.deleteMany({ where: { gameId } });

    for (const label of fields) {
      console.log('Синхронизация поля:', label);
      await this.prisma.gameField.create({
        data: {
          label,
          gameId,
        },
      });
    }

    console.log(`Синхронизация полей для игры ${gameId} завершена`);
  }

  private async syncServers(gameId: number, servers: Record<string, any>) {
    const serverEntries = Object.entries(servers);
    console.log(
      `Синхронизация ${serverEntries.length} серверов для игры ${gameId}`,
    );

    await this.prisma.gameServer.deleteMany({ where: { gameId } });

    for (const [name, code] of serverEntries) {
      console.log('Синхронизация сервера:', name, code);
      await this.prisma.gameServer.create({
        data: {
          name,
          code: String(code),
          gameId,
        },
      });
    }

    console.log(`Синхронизация серверов для игры ${gameId} завершена`);
  }

  private async syncPositions(gameId: number, positions: any) {
    if (!positions) {
      console.log(`Нет позиций для игры ${gameId}`);
      return;
    }

    let positionsArray: any[] = [];

    if (Array.isArray(positions)) {
      positionsArray = positions;
    } else if (typeof positions === 'object') {
      const values = Object.values(positions);

      if (values.length > 0 && Array.isArray(values[0])) {
        positionsArray = values.flat();
      } else {
        positionsArray = values;
      }
    }

    positionsArray = positionsArray.filter(
      (pos) => pos && typeof pos === 'object' && pos.id,
    );

    console.log(
      `Синхронизация ${positionsArray.length} позиций для игры ${gameId}`,
    );

    await this.prisma.position.deleteMany({
      where: { gameId },
    });

    const batchSize = 50;

    for (let i = 0; i < positionsArray.length; i += batchSize) {
      const batch = positionsArray.slice(i, i + batchSize);
      console.log(
        `Обработка батча ${Math.floor(i / batchSize) + 1}: ${batch.length} позиций`,
      );

      const createPromises = batch.map((position) => {
        console.log('Создание позиции:', position.id, position.name);

        return this.prisma.position.create({
          data: {
            donateHubPositionId: Number(position.id),
            name: position.name || 'Без названия',
            price: Number(position.price) || 0,
            myPrice: Number(position.price) || 0,
            gameId,
          },
        });
      });

      try {
        await Promise.all(createPromises);
        console.log(`Батч ${Math.floor(i / batchSize) + 1} успешно обработан`);
      } catch (error) {
        console.error(
          `Ошибка при обработке батча ${Math.floor(i / batchSize) + 1}:`,
          error.message || error,
        );
      }
    }

    console.log(`Синхронизация позиций для игры ${gameId} завершена`);
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
}
