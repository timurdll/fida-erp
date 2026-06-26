export class PlumbLogEntity {
  id: number;
  applicationId: number | null;
  application?: { id: number } | null;

  supplierId: number;
  supplier?: { id: number; name: string };
  customerId: number;
  customer?: { id: number; name: string };
  materialId: number;
  material?: { id: number; name: string; type: string };
  objectId: number | null;
  object?: { id: number; name: string } | null;
  transportId: number | null;
  transport?: { id: number; plateNumber: string; tare: number | null } | null;
  driverId: number | null;
  driver?: { id: number; fullName: string } | null;
  carrierId: number | null;
  carrier?: { id: number; name: string } | null;
  constructionId: number | null;
  construction?: { id: number; name: string } | null;
  bsuId: number | null;
  bsu?: { id: number; name: string } | null;
  nomenclatureId: number | null;
  nomenclature?: { id: number; name: string } | null;

  tare: number | null;
  gross: number | null;
  net: number | null;

  volume: number | null;
  returnVolume: number | null;
  sealNumber: string | null;
  slumpCone: string | null;
  deliveryType: string | null;

  impurity: number | null;
  cleanNet: number | null;
  documentWeight: number | null;

  firstWeighingAt: Date | null;
  firstOperatorId: number | null;
  firstOperator?: { id: number; fullName: string } | null;
  secondWeighingAt: Date | null;
  secondOperatorId: number | null;
  secondOperator?: { id: number; fullName: string } | null;

  isReturn: boolean;
  originalPlumbLogId: number | null;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
