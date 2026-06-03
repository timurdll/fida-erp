import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CONSTRUCTION_REPOSITORY } from '../../domain/construction/i-construction.repository';
import { PrismaConstructionRepository } from './prisma-construction.repository';
import { ConstructionService } from '../../application/construction/construction.service';
import { ConstructionController } from './construction.controller';

@Module({
  imports: [PrismaModule],
  providers: [
    { provide: CONSTRUCTION_REPOSITORY, useClass: PrismaConstructionRepository },
    ConstructionService,
  ],
  controllers: [ConstructionController],
  exports: [ConstructionService],
})
export class ConstructionModule {}
