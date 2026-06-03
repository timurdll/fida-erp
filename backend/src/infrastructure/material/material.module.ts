import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MATERIAL_REPOSITORY } from '../../domain/material/i-material.repository';
import { PrismaMaterialRepository } from './prisma-material.repository';
import { MaterialService } from '../../application/material/material.service';
import { MaterialController } from './material.controller';

@Module({
  imports: [PrismaModule],
  providers: [
    { provide: MATERIAL_REPOSITORY, useClass: PrismaMaterialRepository },
    MaterialService,
  ],
  controllers: [MaterialController],
  exports: [MaterialService],
})
export class MaterialModule {}
