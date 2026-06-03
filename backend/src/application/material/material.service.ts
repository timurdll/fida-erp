import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MATERIAL_REPOSITORY } from '../../domain/material/i-material.repository';
import type { IMaterialRepository, MaterialFilters } from '../../domain/material/i-material.repository';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';

@Injectable()
export class MaterialService {
  constructor(
    @Inject(MATERIAL_REPOSITORY)
    private readonly repo: IMaterialRepository,
  ) {}

  findAll(filters: MaterialFilters = {}) {
    if (filters.isActive === undefined) filters.isActive = true;
    return this.repo.findAll(filters);
  }

  async findById(id: number) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException(`Материал #${id} не найден`);
    return item;
  }

  create(dto: CreateMaterialDto) { return this.repo.create(dto); }

  async update(id: number, dto: UpdateMaterialDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async deactivate(id: number) {
    await this.findById(id);
    return this.repo.deactivate(id);
  }
}
