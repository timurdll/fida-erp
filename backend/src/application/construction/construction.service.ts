import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CONSTRUCTION_REPOSITORY } from '../../domain/construction/i-construction.repository';
import type { IConstructionRepository, ConstructionFilters } from '../../domain/construction/i-construction.repository';
import { CreateConstructionDto } from './dto/create-construction.dto';
import { UpdateConstructionDto } from './dto/update-construction.dto';

@Injectable()
export class ConstructionService {
  constructor(
    @Inject(CONSTRUCTION_REPOSITORY)
    private readonly repo: IConstructionRepository,
  ) {}

  findAll(filters: ConstructionFilters = {}) {
    return this.repo.findAll(filters);
  }

  async findById(id: number) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException(`Конструкция #${id} не найдена`);
    return item;
  }

  create(dto: CreateConstructionDto) { return this.repo.create(dto); }

  async update(id: number, dto: UpdateConstructionDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async activate(id: number) {
    await this.findById(id);
    return this.repo.activate(id);
  }

  async deactivate(id: number) {
    await this.findById(id);
    return this.repo.deactivate(id);
  }
}
