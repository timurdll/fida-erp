import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BSU_REPOSITORY } from '../../domain/bsu/i-bsu.repository';
import { PrismaBsuRepository } from './prisma-bsu.repository';
import { BsuService } from '../../application/bsu/bsu.service';
import { BsuController } from './bsu.controller';

@Module({
  imports: [PrismaModule],
  providers: [
    { provide: BSU_REPOSITORY, useClass: PrismaBsuRepository },
    BsuService,
  ],
  controllers: [BsuController],
  exports: [BsuService],
})
export class BsuModule {}
