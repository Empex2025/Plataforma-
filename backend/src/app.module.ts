import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { validateEnv } from './config/env.validation.js';
import { RateLimitGuard } from './common/rate-limit/rate-limit.guard.js';
import { RATE_LIMIT_CONFIG } from './common/rate-limit/rate-limit.constants.js';
import { RATE_LIMIT_STORE } from './common/rate-limit/rate-limit.store.js';
import { RedisRateLimitStore } from './common/rate-limit/redis-rate-limit.store.js';
import { buildRateLimitConfig } from './common/rate-limit/rate-limit-config.provider.js';
import { PrismaModule } from './db/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { StoresModule } from './modules/stores/stores.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BrandsModule } from './modules/brands/brands.module';
import { PricesModule } from './modules/prices/prices.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OffersModule } from './modules/offers/offers.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { PlansModule } from './modules/plans/plans.module';
import { IntelligenceModule } from './modules/intelligence/intelligence.module';
import { EventsModule } from './modules/events/events.module';
import { SearchModule } from './modules/search/search.module';
import { ImportsModule } from './modules/imports/imports.module.js';
import { PublicModule } from './modules/public/public.module.js';
import { TagsModule } from './modules/tags/tags.module.js';
import { DiscoveryModule } from './modules/discovery/discovery.module.js';
import { RecommendationsModule } from './modules/recommendations/recommendations.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { AdvertisingModule } from './modules/advertising/advertising.module.js';
import { ConversionsModule } from './modules/conversions/conversions.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { ExperimentsModule } from './modules/experiments/experiments.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { MetricsModule } from './modules/metrics/metrics.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('VALKEY_HOST', 'localhost'),
          port: parseInt(config.get<string>('VALKEY_PORT', '6379'), 10),
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    StoresModule,
    ProductsModule,
    CategoriesModule,
    BrandsModule,
    PricesModule,
    InventoryModule,
    OffersModule,
    FavoritesModule,
    ReviewsModule,
    ContactsModule,
    AlertsModule,
    PlansModule,
    IntelligenceModule,
    EventsModule,
    SearchModule,
    ImportsModule,
    PublicModule,
    TagsModule,
    DiscoveryModule,
    RecommendationsModule,
    AnalyticsModule,
    AdvertisingModule,
    ConversionsModule,
    NotificationsModule,
    ExperimentsModule,
    HealthModule,
    MetricsModule,
  ],
  providers: [
    {
      provide: RATE_LIMIT_CONFIG,
      inject: [ConfigService],
      useFactory: buildRateLimitConfig,
    },
    {
      provide: RATE_LIMIT_STORE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new RedisRateLimitStore({
          host: config.get<string>('VALKEY_HOST', 'localhost'),
          port: parseInt(config.get<string>('VALKEY_PORT', '6379'), 10),
          ...(config.get<string>('VALKEY_PASSWORD')
            ? { password: config.get<string>('VALKEY_PASSWORD') }
            : {}),
        }),
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule {}
