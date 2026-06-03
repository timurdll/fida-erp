import type { ObjectEntity } from './object.entity';
import type { CreateObjectDto } from '../../application/object/dto/create-object.dto';
import type { UpdateObjectDto } from '../../application/object/dto/update-object.dto';

export const OBJECT_REPOSITORY = 'OBJECT_REPOSITORY';

export interface ObjectFilters {
  isActive?: boolean;
  search?: string;
  companyId?: number;
}

export interface IObjectRepository {
  findAll(filters: ObjectFilters): Promise<ObjectEntity[]>;
  findById(id: number): Promise<ObjectEntity | null>;
  create(data: CreateObjectDto): Promise<ObjectEntity>;
  update(id: number, data: UpdateObjectDto): Promise<ObjectEntity>;
  deactivate(id: number): Promise<ObjectEntity>;
}
