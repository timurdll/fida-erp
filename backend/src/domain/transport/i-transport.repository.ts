import type { TransportEntity } from './transport.entity';
import type { CreateTransportDto } from '../../application/transport/dto/create-transport.dto';
import type { UpdateTransportDto } from '../../application/transport/dto/update-transport.dto';

export const TRANSPORT_REPOSITORY = 'TRANSPORT_REPOSITORY';

export interface TransportFilters {
  isActive?: boolean;
  search?: string;
  carrierId?: number;
  driverId?: number;
}

export interface ITransportRepository {
  findAll(filters: TransportFilters): Promise<TransportEntity[]>;
  findById(id: number): Promise<TransportEntity | null>;
  create(data: CreateTransportDto): Promise<TransportEntity>;
  update(id: number, data: UpdateTransportDto): Promise<TransportEntity>;
  deactivate(id: number): Promise<TransportEntity>;
}
