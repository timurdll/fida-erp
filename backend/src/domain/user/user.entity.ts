export enum UserRole {
  ADMIN = 'ADMIN',
  DEPUTY_DIRECTOR = 'DEPUTY_DIRECTOR',
  SALES_HEAD = 'SALES_HEAD',
  MANAGER = 'MANAGER',
  DISPATCHER = 'DISPATCHER',
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Администратор',
  [UserRole.DEPUTY_DIRECTOR]: 'Заместитель директора',
  [UserRole.SALES_HEAD]: 'Руководитель отдела продаж',
  [UserRole.MANAGER]: 'Менеджер отдела продаж',
  [UserRole.DISPATCHER]: 'Диспетчер весовой',
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
