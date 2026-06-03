export enum MaterialType {
  CONCRETE = 'CONCRETE',
  SAND = 'SAND',
  GRAVEL = 'GRAVEL',
  CEMENT = 'CEMENT',
  OTHER = 'OTHER',
}

export class MaterialEntity {
  id: number;
  name: string;
  type: MaterialType;
  density: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
