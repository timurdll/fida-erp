import type { BsuEntity } from './bsu.entity';
import type { CreateBsuDto } from '../../application/bsu/dto/create-bsu.dto';
import type { UpdateBsuDto } from '../../application/bsu/dto/update-bsu.dto';

export const BSU_REPOSITORY = 'BSU_REPOSITORY';

export interface BsuFilters {
  isActive?: boolean;
  search?: string;
  companyId?: number;
}

export interface IBsuRepository {
  findAll(filters: BsuFilters): Promise<BsuEntity[]>;
  findById(id: number): Promise<BsuEntity | null>;
  create(data: CreateBsuDto): Promise<BsuEntity>;
  update(id: number, data: UpdateBsuDto): Promise<BsuEntity>;
  deactivate(id: number): Promise<BsuEntity>;
}
