export class BsuEntity {
  id: number;
  name: string;
  address: string | null;
  companies: { id: number; name: string }[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
