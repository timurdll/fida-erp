import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NOMENCLATURE_REPOSITORY } from '../../domain/nomenclature/i-nomenclature.repository';
import { PrismaNomenclatureRepository } from './prisma-nomenclature.repository';
import { NomenclatureService } from '../../application/nomenclature/nomenclature.service';
import { NomenclatureController } from './nomenclature.controller';

@Module({
  imports: [PrismaModule],
  providers: [
    { provide: NOMENCLATURE_REPOSITORY, useClass: PrismaNomenclatureRepository },
    NomenclatureService,
  ],
  controllers: [NomenclatureController],
  exports: [NomenclatureService],
})
export class NomenclatureModule {}
