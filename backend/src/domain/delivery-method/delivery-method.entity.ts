export class DeliveryMethodEntity {
  id: number;
  name: string;
  type: string | null;
  note: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
