import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Check GiftAPI configuration
  const giftapiUrl = config.get<string>('GIFTAPI_BASE_URL');
  const giftapiToken = config.get<string>('GIFTAPI_TOKEN');
  const giftapiSecret = config.get<string>('GIFTAPI_SECRET');

  if (giftapiUrl && giftapiToken && giftapiSecret) {
    logger.log('✅ GiftAPI configuration loaded');
    logger.log(`   Base URL: ${giftapiUrl}`);
  } else {
    logger.warn('⚠️  GiftAPI not configured. Set env variables:');
    logger.warn('   GIFTAPI_BASE_URL');
    logger.warn('   GIFTAPI_TOKEN');
    logger.warn('   GIFTAPI_SECRET');
  }

  app.setGlobalPrefix('api');
  app.use(require('cookie-parser')());
  app.enableCors({
    origin: [config.get<string>('CLIENT_URL')],
    credentials: true,
    exposeHeaders: 'set-cookie',
  });

  const port = config.get<number>('SERVER_PORT') ?? 5000;
  await app.listen(port);

  logger.log(`🚀 Server is running on http://localhost:${port}/api`);
}

bootstrap();
