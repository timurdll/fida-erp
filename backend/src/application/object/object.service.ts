import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { OBJECT_REPOSITORY } from '../../domain/object/i-object.repository';
import type { IObjectRepository, ObjectFilters } from '../../domain/object/i-object.repository';
import { CreateObjectDto } from './dto/create-object.dto';
import { UpdateObjectDto } from './dto/update-object.dto';

@Injectable()
export class ObjectService {
  constructor(
    @Inject(OBJECT_REPOSITORY)
    private readonly repo: IObjectRepository,
  ) {}

  findAll(filters: ObjectFilters = {}) {
    if (filters.isActive === undefined) filters.isActive = true;
    return this.repo.findAll(filters);
  }

  async findById(id: number) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException(`Объект #${id} не найден`);
    return item;
  }

  create(dto: CreateObjectDto) { return this.repo.create(dto); }

  async update(id: number, dto: UpdateObjectDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async deactivate(id: number) {
    await this.findById(id);
    return this.repo.deactivate(id);
  }
}
