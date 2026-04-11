import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { startMemoryMonitor } from './memory';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({
    origin: [process.env.CLIENT_URL],
    credentials: true,
    exposeHeaders: 'set-cookie',
  });

  app.get(HttpAdapterHost);

  startMemoryMonitor();

  await app.listen(process.env.SERVER_PORT ?? 5000);
}
bootstrap();
