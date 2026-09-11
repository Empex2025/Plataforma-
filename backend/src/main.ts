import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {});
  
  const config = new DocumentBuilder()
    .setTitle('Local Commerce API')
    .setDescription('API da plataforma de comércio local')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  app.use(
    '/docs',
    apiReference({
      theme: "deepSpace",
      showDeveloperTools: "never",
      spec: {
        content: document,
      },
    }),
  );
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();