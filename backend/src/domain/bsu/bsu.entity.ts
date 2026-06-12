export class BsuEntity {
  id: number;
  name: string;
  address: string | null;
  companyId: number;
  company?: { id: number; name: string };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
