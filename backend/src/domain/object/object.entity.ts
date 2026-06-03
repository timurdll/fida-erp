export class ObjectEntity {
  id: number;
  name: string;
  companyId: number;
  company: { id: number; name: string } | null;
  address: string | null;
  receiverPhone: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
