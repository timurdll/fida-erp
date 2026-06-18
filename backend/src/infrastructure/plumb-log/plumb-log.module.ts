import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PLUMB_LOG_REPOSITORY } from '../../domain/plumb-log/i-plumb-log.repository';
import { PrismaPlumbLogRepository } from './prisma-plumb-log.repository';
import { PlumbLogService } from '../../application/plumb-log/plumb-log.service';
import { PlumbLogController } from './plumb-log.controller';
import { APPLICATION_REPOSITORY } from '../../domain/application/i-application.repository';
import { PrismaApplicationRepository } from '../application/prisma-application.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    { provide: PLUMB_LOG_REPOSITORY, useClass: PrismaPlumbLogRepository },
    { provide: APPLICATION_REPOSITORY, useClass: PrismaApplicationRepository },
    PlumbLogService,
  ],
  controllers: [PlumbLogController],
  exports: [PlumbLogService],
})
export class PlumbLogModule {}
