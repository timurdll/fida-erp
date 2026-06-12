import type { NomenclatureEntity } from './nomenclature.entity';
import type { CreateNomenclatureDto } from '../../application/nomenclature/dto/create-nomenclature.dto';
import type { UpdateNomenclatureDto } from '../../application/nomenclature/dto/update-nomenclature.dto';

export const NOMENCLATURE_REPOSITORY = 'NOMENCLATURE_REPOSITORY';

export interface NomenclatureFilters {
  isActive?: boolean;
  search?: string;
}

export interface INomenclatureRepository {
  findAll(filters: NomenclatureFilters): Promise<NomenclatureEntity[]>;
  findById(id: number): Promise<NomenclatureEntity | null>;
  create(data: CreateNomenclatureDto): Promise<NomenclatureEntity>;
  update(id: number, data: UpdateNomenclatureDto): Promise<NomenclatureEntity>;
  deactivate(id: number): Promise<NomenclatureEntity>;
}
