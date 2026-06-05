import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { APPLICATION_REPOSITORY } from '../../domain/application/i-application.repository';
import { PrismaApplicationRepository } from './prisma-application.repository';
import { ApplicationService } from '../../application/application/application.service';
import { ApplicationController } from './application.controller';

@Module({
  imports: [PrismaModule],
  providers: [
    { provide: APPLICATION_REPOSITORY, useClass: PrismaApplicationRepository },
    ApplicationService,
  ],
  controllers: [ApplicationController],
  exports: [ApplicationService],
})
export class ApplicationModule {}
