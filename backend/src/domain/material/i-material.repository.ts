import type { MaterialEntity, MaterialType } from './material.entity';
import type { CreateMaterialDto } from '../../application/material/dto/create-material.dto';
import type { UpdateMaterialDto } from '../../application/material/dto/update-material.dto';

export const MATERIAL_REPOSITORY = 'MATERIAL_REPOSITORY';

export interface MaterialFilters {
  isActive?: boolean;
  search?: string;
  excludeType?: MaterialType;
  filterType?: MaterialType;
}

export interface IMaterialRepository {
  findAll(filters: MaterialFilters): Promise<MaterialEntity[]>;
  findById(id: number): Promise<MaterialEntity | null>;
  create(data: CreateMaterialDto): Promise<MaterialEntity>;
  update(id: number, data: UpdateMaterialDto): Promise<MaterialEntity>;
  activate(id: number): Promise<MaterialEntity>;
  deactivate(id: number): Promise<MaterialEntity>;
}
