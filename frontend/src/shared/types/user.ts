export type UserRole =
  | 'ADMIN'
  | 'DEPUTY_DIRECTOR'
  | 'SALES_HEAD'
  | 'MANAGER'
  | 'DISPATCHER'
  | 'OPERATIONAL_DIRECTOR'
  | 'LOGIST'
  | 'LABORANT'
  | 'FOUNDER'
  | 'ACCOUNTANT'
  | 'BSU_MASTER'
  | 'SITE_MANAGER'
  | 'OPERATOR'
  | 'TECHNOLOGIST'
  | 'FINANCIAL_DIRECTOR'
  | 'FACTORY_DIRECTOR'
  | 'SECURITY_HEAD'
  | 'SECURITY_SPECIALIST'

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Администратор',
  DEPUTY_DIRECTOR: 'Заместитель директора',
  SALES_HEAD: 'Руководитель отдела продаж',
  MANAGER: 'Менеджер отдела продаж',
  DISPATCHER: 'Диспетчер весовой',
  OPERATIONAL_DIRECTOR: 'Операционный директор',
  LOGIST: 'Логист',
  LABORANT: 'Лаборант',
  FOUNDER: 'Учредитель',
  ACCOUNTANT: 'Бухгалтер',
  BSU_MASTER: 'Мастер БСУ',
  SITE_MANAGER: 'Начальник участка',
  OPERATOR: 'Оператор',
  TECHNOLOGIST: 'Технолог',
  FINANCIAL_DIRECTOR: 'Финансовый директор',
  FACTORY_DIRECTOR: 'Директор завода',
  SECURITY_HEAD: 'Начальник СБ',
  SECURITY_SPECIALIST: 'Специалист СБ',
}

export interface User {
  id: number
  fullName: string
  login: string
  role: UserRole
  isActive: boolean
  note?: string
}
