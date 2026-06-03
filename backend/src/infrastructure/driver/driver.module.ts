import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DRIVER_REPOSITORY } from '../../domain/driver/i-driver.repository';
import { PrismaDriverRepository } from './prisma-driver.repository';
import { DriverService } from '../../application/driver/driver.service';
import { DriverController } from './driver.controller';

@Module({
  imports: [PrismaModule],
  providers: [
    { provide: DRIVER_REPOSITORY, useClass: PrismaDriverRepository },
    DriverService,
  ],
  controllers: [DriverController],
  exports: [DriverService],
})
export class DriverModule {}
