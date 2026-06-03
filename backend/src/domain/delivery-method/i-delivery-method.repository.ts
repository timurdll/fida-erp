import type { DeliveryMethodEntity } from './delivery-method.entity';
import type { CreateDeliveryMethodDto } from '../../application/delivery-method/dto/create-delivery-method.dto';
import type { UpdateDeliveryMethodDto } from '../../application/delivery-method/dto/update-delivery-method.dto';

export const DELIVERY_METHOD_REPOSITORY = 'DELIVERY_METHOD_REPOSITORY';

export interface DeliveryMethodFilters {
  isActive?: boolean;
  search?: string;
}

export interface IDeliveryMethodRepository {
  findAll(filters: DeliveryMethodFilters): Promise<DeliveryMethodEntity[]>;
  findById(id: number): Promise<DeliveryMethodEntity | null>;
  create(data: CreateDeliveryMethodDto): Promise<DeliveryMethodEntity>;
  update(id: number, data: UpdateDeliveryMethodDto): Promise<DeliveryMethodEntity>;
  deactivate(id: number): Promise<DeliveryMethodEntity>;
}
