export enum ApplicationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface ApplicationProgress {
  shippedVolume: number;
  loadingVolume: number;
  remainVolume: number;
  totalPlumbs: number;
}

export interface PlumbLogSummary {
  id: number;
  tare: number;
  gross: number | null;
  net: number | null;
  volume: number | null;
  bsuId: number | null;
  bsu: { id: number; name: string } | null;
  firstWeighingAt: Date | null;
  secondWeighingAt: Date | null;
  transport: { id: number; plateNumber: string } | null;
  driver: { id: number; fullName: string } | null;
  isReturn: boolean;
  isActive: boolean;
}

export class ApplicationEntity {
  id: number;
  supplierId: number;
  supplier?: { id: number; name: string };
  customerId: number;
  customer?: { id: number; name: string };
  objectId: number;
  object?: { id: number; name: string; address: string | null };
  materialId: number;
  material?: { id: number; name: string; type: string };
  constructionId: number | null;
  construction?: { id: number; name: string } | null;
  deliveryMethodId: number | null;
  deliveryMethod?: { id: number; name: string } | null;
  authorId: number;
  author?: { id: number; fullName: string };
  targetVolume: number;
  deliveryDate: Date;
  deliveryTime: string | null;
  loadingInterval: number | null;
  slumpCone: string | null;
  note: string | null;
  status: ApplicationStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  progress?: ApplicationProgress;
  plumbLogs?: PlumbLogSummary[];
}
