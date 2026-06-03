import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { COMPANY_REPOSITORY } from '../../domain/company/i-company.repository';
import { PrismaCompanyRepository } from './prisma-company.repository';
import { CompanyService } from '../../application/company/company.service';
import { CompanyController } from './company.controller';

@Module({
  imports: [PrismaModule],
  providers: [
    { provide: COMPANY_REPOSITORY, useClass: PrismaCompanyRepository },
    CompanyService,
  ],
  controllers: [CompanyController],
  exports: [CompanyService],
})
export class CompanyModule {}
