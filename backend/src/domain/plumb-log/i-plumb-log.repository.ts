import type { PlumbLogEntity } from './plumb-log.entity';
import type { CreatePlumbLogDto } from '../../application/plumb-log/dto/create-plumb-log.dto';
import type { UpdatePlumbLogDto } from '../../application/plumb-log/dto/update-plumb-log.dto';

export const PLUMB_LOG_REPOSITORY = 'PLUMB_LOG_REPOSITORY';

export interface PlumbLogFilters {
  dateFrom?: string;
  dateTo?: string;
  isActive?: boolean;
  isReturn?: boolean;
  supplierId?: number;
  customerId?: number;
  materialId?: number;
  applicationId?: number;
}

export interface IPlumbLogRepository {
  findAll(filters: PlumbLogFilters): Promise<PlumbLogEntity[]>;
  findById(id: number): Promise<PlumbLogEntity | null>;
  create(data: CreatePlumbLogDto & { firstOperatorId: number }): Promise<PlumbLogEntity>;
  update(id: number, data: UpdatePlumbLogDto): Promise<PlumbLogEntity>;
  weighTare(id: number, tare: number, operatorId: number): Promise<PlumbLogEntity>;
  weighGross(id: number, gross: number, operatorId: number): Promise<PlumbLogEntity>;
  createReturn(originalId: number, operatorId: number): Promise<PlumbLogEntity>;
  deactivate(id: number): Promise<PlumbLogEntity>;
}
