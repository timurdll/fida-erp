export enum CompanyFunction {
  CUSTOMER = 'CUSTOMER',
  SUPPLIER = 'SUPPLIER',
  ALL = 'ALL',
}

export enum CompanyType {
  TOO = 'TOO',
  IP = 'IP',
  CHL = 'CHL',
}

export class CompanyEntity {
  id: number;
  name: string;
  function: CompanyFunction;
  bin: string | null;
  type: CompanyType;
  contactPhone: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
