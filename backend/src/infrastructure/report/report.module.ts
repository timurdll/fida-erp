import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { REPORT_REPOSITORY } from '../../domain/report/i-report.repository';
import { PrismaReportRepository } from './prisma-report.repository';
import { ReportService } from '../../application/report/report.service';
import { ReportExcelBuilder } from './report-excel.builder';
import { ReportController } from './report.controller';

@Module({
  imports: [PrismaModule],
  providers: [
    { provide: REPORT_REPOSITORY, useClass: PrismaReportRepository },
    ReportService,
    ReportExcelBuilder,
  ],
  controllers: [ReportController],
})
export class ReportModule {}
