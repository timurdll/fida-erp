export type CompanyFunction = 'CUSTOMER' | 'SUPPLIER' | 'ALL'
export type CompanyType = 'TOO' | 'IP' | 'CHL'

export const CompanyFunctionLabel: Record<CompanyFunction, string> = {
  CUSTOMER: 'Заказчик',
  SUPPLIER: 'Поставщик',
  ALL: 'Все',
}
export const CompanyTypeLabel: Record<CompanyType, string> = {
  TOO: 'ТОО',
  IP: 'ИП',
  CHL: 'ЧЛ',
}

export interface Company {
  id: number
  name: string
  function: CompanyFunction
  bin?: string
  type: CompanyType
  contactPhone?: string
  isActive: boolean
}

export interface CreateCompanyDto {
  name: string
  function: CompanyFunction
  type: CompanyType
  bin?: string
  contactPhone?: string
}

export type UpdateCompanyDto = Partial<CreateCompanyDto>
