export enum UserRole {
  ADMIN = 'ADMIN',
  DEPUTY_DIRECTOR = 'DEPUTY_DIRECTOR',
  SALES_HEAD = 'SALES_HEAD',
  MANAGER = 'MANAGER',
  DISPATCHER = 'DISPATCHER',
  OPERATIONAL_DIRECTOR = 'OPERATIONAL_DIRECTOR',
  LOGIST = 'LOGIST',
  LABORANT = 'LABORANT',
  FOUNDER = 'FOUNDER',
  ACCOUNTANT = 'ACCOUNTANT',
  BSU_MASTER = 'BSU_MASTER',
  SITE_MANAGER = 'SITE_MANAGER',
  OPERATOR = 'OPERATOR',
  TECHNOLOGIST = 'TECHNOLOGIST',
  FINANCIAL_DIRECTOR = 'FINANCIAL_DIRECTOR',
  FACTORY_DIRECTOR = 'FACTORY_DIRECTOR',
  SECURITY_HEAD = 'SECURITY_HEAD',
  SECURITY_SPECIALIST = 'SECURITY_SPECIALIST',
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Администратор',
  [UserRole.DEPUTY_DIRECTOR]: 'Заместитель директора',
  [UserRole.SALES_HEAD]: 'Руководитель отдела продаж',
  [UserRole.MANAGER]: 'Менеджер отдела продаж',
  [UserRole.DISPATCHER]: 'Диспетчер весовой',
  [UserRole.OPERATIONAL_DIRECTOR]: 'Операционный директор',
  [UserRole.LOGIST]: 'Логист',
  [UserRole.LABORANT]: 'Лаборант',
  [UserRole.FOUNDER]: 'Учредитель',
  [UserRole.ACCOUNTANT]: 'Бухгалтер',
  [UserRole.BSU_MASTER]: 'Мастер БСУ',
  [UserRole.SITE_MANAGER]: 'Начальник участка',
  [UserRole.OPERATOR]: 'Оператор',
  [UserRole.TECHNOLOGIST]: 'Технолог',
  [UserRole.FINANCIAL_DIRECTOR]: 'Финансовый директор',
  [UserRole.FACTORY_DIRECTOR]: 'Директор завода',
  [UserRole.SECURITY_HEAD]: 'Начальник СБ',
  [UserRole.SECURITY_SPECIALIST]: 'Специалист СБ',
};

export class UserEntity {
  id: number;
  fullName: string;
  login: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}
