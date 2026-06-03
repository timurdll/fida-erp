import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CARRIER_REPOSITORY } from '../../domain/carrier/i-carrier.repository';
import { PrismaCarrierRepository } from './prisma-carrier.repository';
import { CarrierService } from '../../application/carrier/carrier.service';
import { CarrierController } from './carrier.controller';

@Module({
  imports: [PrismaModule],
  providers: [
    { provide: CARRIER_REPOSITORY, useClass: PrismaCarrierRepository },
    CarrierService,
  ],
  controllers: [CarrierController],
  exports: [CarrierService],
})
export class CarrierModule {}
