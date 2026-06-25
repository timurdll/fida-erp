import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { AuthModule } from './infrastructure/auth/auth.module';
import { UsersModule } from './infrastructure/users/users.module';
import { MaterialModule } from './infrastructure/material/material.module';
import { ConstructionModule } from './infrastructure/construction/construction.module';
import { DeliveryMethodModule } from './infrastructure/delivery-method/delivery-method.module';
import { CarrierModule } from './infrastructure/carrier/carrier.module';
import { DriverModule } from './infrastructure/driver/driver.module';
import { CompanyModule } from './infrastructure/company/company.module';
import { ObjectModule } from './infrastructure/object/object.module';
import { TransportModule } from './infrastructure/transport/transport.module';
import { ApplicationModule } from './infrastructure/application/application.module';
import { BsuModule } from './infrastructure/bsu/bsu.module';
import { NomenclatureModule } from './infrastructure/nomenclature/nomenclature.module';
import { PlumbLogModule } from './infrastructure/plumb-log/plumb-log.module';
import { ReportModule } from './infrastructure/report/report.module';
import { HealthModule } from './infrastructure/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    MaterialModule,
    ConstructionModule,
    DeliveryMethodModule,
    CarrierModule,
    DriverModule,
    CompanyModule,
    ObjectModule,
    TransportModule,
    ApplicationModule,
    BsuModule,
    NomenclatureModule,
    PlumbLogModule,
    ReportModule,
  ],
})
export class AppModule {}
