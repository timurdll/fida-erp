import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DELIVERY_METHOD_REPOSITORY } from '../../domain/delivery-method/i-delivery-method.repository';
import { PrismaDeliveryMethodRepository } from './prisma-delivery-method.repository';
import { DeliveryMethodService } from '../../application/delivery-method/delivery-method.service';
import { DeliveryMethodController } from './delivery-method.controller';

@Module({
  imports: [PrismaModule],
  providers: [
    { provide: DELIVERY_METHOD_REPOSITORY, useClass: PrismaDeliveryMethodRepository },
    DeliveryMethodService,
  ],
  controllers: [DeliveryMethodController],
  exports: [DeliveryMethodService],
})
export class DeliveryMethodModule {}
