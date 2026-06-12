import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PLUMB_LOG_REPOSITORY } from '../../domain/plumb-log/i-plumb-log.repository';
import type { IPlumbLogRepository, PlumbLogFilters } from '../../domain/plumb-log/i-plumb-log.repository';
import { CreatePlumbLogDto } from './dto/create-plumb-log.dto';
import { UpdatePlumbLogDto } from './dto/update-plumb-log.dto';

@Injectable()
export class PlumbLogService {
  constructor(
    @Inject(PLUMB_LOG_REPOSITORY)
    private readonly repo: IPlumbLogRepository,
  ) {}

  findAll(filters: PlumbLogFilters = {}) {
    return this.repo.findAll(filters);
  }

  async findById(id: number) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException(`Отвес #${id} не найден`);
    return item;
  }

  create(dto: CreatePlumbLogDto, operatorId: number) {
    return this.repo.create({ ...dto, firstOperatorId: operatorId });
  }

  async update(id: number, dto: UpdatePlumbLogDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async weighTare(id: number, weight: number, operatorId: number) {
    await this.findById(id);
    return this.repo.weighTare(id, weight, operatorId);
  }

  async weighGross(id: number, weight: number, operatorId: number) {
    await this.findById(id);
    return this.repo.weighGross(id, weight, operatorId);
  }

  async createReturn(id: number, operatorId: number) {
    await this.findById(id);
    return this.repo.createReturn(id, operatorId);
  }

  async deactivate(id: number) {
    await this.findById(id);
    return this.repo.deactivate(id);
  }
}
