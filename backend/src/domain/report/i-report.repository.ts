import type { CompanyType } from '../company/company.entity';

export const REPORT_REPOSITORY = 'REPORT_REPOSITORY';

export interface ReportFilters {
  dateFrom: Date;
  dateTo: Date;
  supplierIds?: number[];
  customerIds?: number[];
  materialIds?: number[];
  carrierIds?: number[];
  objectIds?: number[];
  supplierType?: CompanyType;
  customerType?: CompanyType;
}

/** Лёгкая проекция PlumbLog с разворованными именами связей — единый источник для всех отчётов. */
export interface ReportPlumbRow {
  id: number;
  net: number | null;
  gross: number | null;
  tare: number | null;
  volume: number | null;
  note: string | null;
  firstWeighingAt: Date | null;
  secondWeighingAt: Date | null;
  // имена связей (для ячеек)
  supplierName: string | null;
  customerName: string | null;
  materialName: string | null;
  objectName: string | null;
  plateNumber: string | null;
  carrierName: string | null;
  nomenclatureName: string | null;
  operatorName: string | null; // secondOperator?.fullName ?? firstOperator?.fullName
  // id связей (для устойчивой группировки)
  supplierId: number;
  customerId: number;
  materialId: number;
  carrierId: number | null;
  objectId: number | null;
}

export interface ReportApplicationPlumbRow {
  volume: number | null;
  gross: number | null;
}

export interface ReportApplicationRow {
  id: number;
  targetVolume: number;
  deliveryDate: Date;
  deliveryTime: string | null;
  note: string | null;
  supplierId: number;
  customerId: number;
  materialId: number;
  objectId: number;
  supplierName: string | null;
  customerName: string | null;
  materialName: string | null;
  objectName: string | null;
  plumbLogs: ReportApplicationPlumbRow[];
}

export interface IReportRepository {
  /** applicationId IS NULL, isActive=true, isReturn=false */
  findIndependentActive(filters: ReportFilters): Promise<ReportPlumbRow[]>;
  /** applicationId IS NULL, isActive=false */
  findIndependentDeleted(filters: ReportFilters): Promise<ReportPlumbRow[]>;
  /** applicationId IS NOT NULL, isActive=true, isReturn=false */
  findDependentActive(filters: ReportFilters): Promise<ReportPlumbRow[]>;
  /** applicationId IS NOT NULL, isActive=false */
  findDependentDeleted(filters: ReportFilters): Promise<ReportPlumbRow[]>;
  /** isReturn=true */
  findReturns(filters: ReportFilters): Promise<ReportPlumbRow[]>;
  /** Активные заявки за период доставки */
  findApplications(filters: ReportFilters): Promise<ReportApplicationRow[]>;
}
