import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TRANSPORT_REPOSITORY } from '../../domain/transport/i-transport.repository';
import { PrismaTransportRepository } from './prisma-transport.repository';
import { TransportService } from '../../application/transport/transport.service';
import { TransportController } from './transport.controller';

@Module({
  imports: [PrismaModule],
  providers: [
    { provide: TRANSPORT_REPOSITORY, useClass: PrismaTransportRepository },
    TransportService,
  ],
  controllers: [TransportController],
  exports: [TransportService],
})
export class TransportModule {}
