import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BSU_REPOSITORY } from '../../domain/bsu/i-bsu.repository';
import type { IBsuRepository, BsuFilters } from '../../domain/bsu/i-bsu.repository';
import { CreateBsuDto } from './dto/create-bsu.dto';
import { UpdateBsuDto } from './dto/update-bsu.dto';

@Injectable()
export class BsuService {
  constructor(
    @Inject(BSU_REPOSITORY)
    private readonly repo: IBsuRepository,
  ) {}

  findAll(filters: BsuFilters = {}) {
    return this.repo.findAll(filters);
  }

  async findById(id: number) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException(`БСУ #${id} не найден`);
    return item;
  }

  create(dto: CreateBsuDto) {
    return this.repo.create(dto);
  }

  async update(id: number, dto: UpdateBsuDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async deactivate(id: number) {
    await this.findById(id);
    return this.repo.deactivate(id);
  }
}
