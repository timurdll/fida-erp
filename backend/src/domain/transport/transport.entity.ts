export class TransportEntity {
  id: number;
  plateNumber: string;
  driverId: number | null;
  driver: { id: number; fullName: string } | null;
  carrierId: number | null;
  carrier: { id: number; name: string } | null;
  tare: number | null;
  tolerance: number;
  note: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
