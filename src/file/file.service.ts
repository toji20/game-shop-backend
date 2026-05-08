import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { FileResponse } from './file.interface';
import { path } from 'app-root-path';
import { ensureDir, writeFile, remove } from 'fs-extra';
import sharp from 'sharp';

@Injectable()
export class FileService {
  private s3: S3Client;
  private readonly bucket: string;
  private readonly cdnUrl: string;
  private readonly isDev: boolean;

  constructor() {
    this.isDev = process.env.NODE_ENV !== 'production';
    this.bucket = process.env.S3_BUCKET ?? '';
    this.cdnUrl = process.env.CDN_URL ?? '';

    if (!this.isDev) {
      this.s3 = new S3Client({
        region: process.env.S3_REGION ?? 'ru-1',
        endpoint: process.env.S3_ENDPOINT,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY ?? '',
          secretAccessKey: process.env.S3_SECRET_KEY ?? '',
        },
      });
    }
  }

  async saveFiles(
    files: Express.Multer.File[],
    folder: string = 'products',
  ): Promise<FileResponse[]> {
    if (this.isDev) {
      return this.saveLocally(files, folder);
    }
    return this.saveToS3(files, folder);
  }

  async deleteFile(key: string): Promise<void> {
    if (this.isDev) {
      await remove(`${path}/uploads/${key}`).catch(() => {});
      return;
    }

    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  private async saveLocally(
    files: Express.Multer.File[],
    folder: string,
  ): Promise<FileResponse[]> {
    const uploadedFolder = `${path}/uploads/${folder}`;
    await ensureDir(uploadedFolder);

    return Promise.all(
      files.map(async (file) => {
        const isImage = file.mimetype.startsWith('image/');
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const name = isImage
          ? `${fileName}.webp`
          : `${fileName}-${file.originalname}`;

        const body = isImage
          ? await sharp(file.buffer).webp({ quality: 85 }).toBuffer()
          : file.buffer;

        await writeFile(`${uploadedFolder}/${name}`, body);

        return {
          url: `http://localhost:5000/uploads/${folder}/${name}`,
          name: `${folder}/${name}`,
        };
      }),
    );
  }

  private async saveToS3(
    files: Express.Multer.File[],
    folder: string,
  ): Promise<FileResponse[]> {
    return Promise.all(
      files.map(async (file) => {
        const isImage = file.mimetype.startsWith('image/');
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const key = isImage
          ? `${folder}/${fileName}.webp`
          : `${folder}/${fileName}-${file.originalname}`;

        const body = isImage
          ? await sharp(file.buffer).webp({ quality: 85 }).toBuffer()
          : file.buffer;

        await this.s3.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: body,
            ContentType: isImage ? 'image/webp' : file.mimetype,
            CacheControl: 'public, max-age=31536000',
          }),
        );

        // Отдаём URL через CDN а не напрямую через S3
        return {
          url: `${this.cdnUrl}/${key}`,
          name: key,
        };
      }),
    );
  }
}
