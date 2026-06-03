export type UserRole =
  | 'ADMIN'
  | 'DEPUTY_DIRECTOR'
  | 'SALES_HEAD'
  | 'MANAGER'
  | 'DISPATCHER'

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Администратор',
  DEPUTY_DIRECTOR: 'Зам. директора',
  SALES_HEAD: 'Рук. отдела продаж',
  MANAGER: 'Менеджер',
  DISPATCHER: 'Диспетчер',
}

export interface User {
  id: number
  fullName: string
  login: string
  role: UserRole
  isActive: boolean
  note?: string
}
