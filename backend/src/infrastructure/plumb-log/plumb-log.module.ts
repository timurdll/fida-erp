import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PLUMB_LOG_REPOSITORY } from '../../domain/plumb-log/i-plumb-log.repository';
import { PrismaPlumbLogRepository } from './prisma-plumb-log.repository';
import { PlumbLogService } from '../../application/plumb-log/plumb-log.service';
import { PlumbLogController } from './plumb-log.controller';

@Module({
  imports: [PrismaModule],
  providers: [
    { provide: PLUMB_LOG_REPOSITORY, useClass: PrismaPlumbLogRepository },
    PlumbLogService,
  ],
  controllers: [PlumbLogController],
  exports: [PlumbLogService],
})
export class PlumbLogModule {}
