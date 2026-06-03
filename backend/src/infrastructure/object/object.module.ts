import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OBJECT_REPOSITORY } from '../../domain/object/i-object.repository';
import { PrismaObjectRepository } from './prisma-object.repository';
import { ObjectService } from '../../application/object/object.service';
import { ObjectController } from './object.controller';

@Module({
  imports: [PrismaModule],
  providers: [
    { provide: OBJECT_REPOSITORY, useClass: PrismaObjectRepository },
    ObjectService,
  ],
  controllers: [ObjectController],
  exports: [ObjectService],
})
export class ObjectModule {}
