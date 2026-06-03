import type { CarrierEntity } from './carrier.entity';
import type { CreateCarrierDto } from '../../application/carrier/dto/create-carrier.dto';
import type { UpdateCarrierDto } from '../../application/carrier/dto/update-carrier.dto';

export const CARRIER_REPOSITORY = 'CARRIER_REPOSITORY';

export interface CarrierFilters {
  isActive?: boolean;
  search?: string;
}

export interface ICarrierRepository {
  findAll(filters: CarrierFilters): Promise<CarrierEntity[]>;
  findById(id: number): Promise<CarrierEntity | null>;
  create(data: CreateCarrierDto): Promise<CarrierEntity>;
  update(id: number, data: UpdateCarrierDto): Promise<CarrierEntity>;
  deactivate(id: number): Promise<CarrierEntity>;
}
