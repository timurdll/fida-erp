import type { ConstructionEntity } from './construction.entity';
import type { CreateConstructionDto } from '../../application/construction/dto/create-construction.dto';
import type { UpdateConstructionDto } from '../../application/construction/dto/update-construction.dto';

export const CONSTRUCTION_REPOSITORY = 'CONSTRUCTION_REPOSITORY';

export interface ConstructionFilters {
  isActive?: boolean;
  search?: string;
}

export interface IConstructionRepository {
  findAll(filters: ConstructionFilters): Promise<ConstructionEntity[]>;
  findById(id: number): Promise<ConstructionEntity | null>;
  create(data: CreateConstructionDto): Promise<ConstructionEntity>;
  update(id: number, data: UpdateConstructionDto): Promise<ConstructionEntity>;
  deactivate(id: number): Promise<ConstructionEntity>;
}
