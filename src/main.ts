import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AuthGuard } from './config/auth.guard';
import cookieParser = require('cookie-parser');
import { configDotenv } from 'dotenv';

configDotenv();
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(cookieParser());
  app.useGlobalGuards(new AuthGuard());
  app.enableCors({
    origin: [
      'http://10.1.48.35:3039',
      'http://10.1.52.182:3039',
      'http://localhost:3039',
      'http://10.1.49.30:3039',
      'http://113.161.66.125:3039',
      'https://services.benthanhtsc.com',
    ],
    credentials: true,
  });
  // Cho FE truy cập thư mục uploads
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/', // URL truy cập file
  });

  // Thay đổi kích thước payload tối đa
  app.use(bodyParser.json({ limit: '10mb' })); // 10MB
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
  await app.listen(8168, '0.0.0.0');
}
bootstrap();
