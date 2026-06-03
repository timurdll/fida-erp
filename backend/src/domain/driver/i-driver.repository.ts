import type { DriverEntity } from './driver.entity';
import type { CreateDriverDto } from '../../application/driver/dto/create-driver.dto';
import type { UpdateDriverDto } from '../../application/driver/dto/update-driver.dto';

export const DRIVER_REPOSITORY = 'DRIVER_REPOSITORY';

export interface DriverFilters {
  isActive?: boolean;
  search?: string;
}

export interface IDriverRepository {
  findAll(filters: DriverFilters): Promise<DriverEntity[]>;
  findById(id: number): Promise<DriverEntity | null>;
  create(data: CreateDriverDto): Promise<DriverEntity>;
  update(id: number, data: UpdateDriverDto): Promise<DriverEntity>;
  activate(id: number): Promise<DriverEntity>;
  deactivate(id: number): Promise<DriverEntity>;
}
