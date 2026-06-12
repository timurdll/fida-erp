import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NOMENCLATURE_REPOSITORY } from '../../domain/nomenclature/i-nomenclature.repository';
import type { INomenclatureRepository, NomenclatureFilters } from '../../domain/nomenclature/i-nomenclature.repository';
import { CreateNomenclatureDto } from './dto/create-nomenclature.dto';
import { UpdateNomenclatureDto } from './dto/update-nomenclature.dto';

@Injectable()
export class NomenclatureService {
  constructor(
    @Inject(NOMENCLATURE_REPOSITORY)
    private readonly repo: INomenclatureRepository,
  ) {}

  findAll(filters: NomenclatureFilters = {}) {
    return this.repo.findAll(filters);
  }

  async findById(id: number) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException(`Номенклатура #${id} не найдена`);
    return item;
  }

  create(dto: CreateNomenclatureDto) {
    return this.repo.create(dto);
  }

  async update(id: number, dto: UpdateNomenclatureDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async deactivate(id: number) {
    await this.findById(id);
    return this.repo.deactivate(id);
  }
}
