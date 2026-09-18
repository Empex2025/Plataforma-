import { NestFactory } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { requestContextMiddleware } from './common/middleware/request-context.middleware.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  app.use(requestContextMiddleware);

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  app.use(compression());

  const config = app.get(ConfigService);
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOrigins = (config.get<string>('CORS_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (allowedOrigins.length > 0) {
    app.enableCors({ origin: allowedOrigins, credentials: true });
  } else if (!isProduction) {
    app.enableCors();
  }

  app.setGlobalPrefix('api');

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get('Reflector')),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  if (!isProduction) {
    const documentConfig = new DocumentBuilder()
      .setTitle('API EncontraÊ')
      .setDescription('API da plataforma EncontraÊ de comércio local')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, documentConfig);

    app.use(
      '/docs',
      apiReference({
        theme: 'deepSpace',
        showDeveloperTools: 'never',
        spec: { content: document },
      }),
    );
  }

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
