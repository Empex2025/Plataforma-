import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
})
export class AppModule {}
