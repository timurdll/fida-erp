import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIVER_REPOSITORY } from '../../domain/driver/i-driver.repository';
import type { IDriverRepository, DriverFilters } from '../../domain/driver/i-driver.repository';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

@Injectable()
export class DriverService {
  constructor(
    @Inject(DRIVER_REPOSITORY)
    private readonly repo: IDriverRepository,
  ) {}

  findAll(filters: DriverFilters = {}) {
    return this.repo.findAll(filters);
  }

  async findById(id: number) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException(`Водитель #${id} не найден`);
    return item;
  }

  create(dto: CreateDriverDto) { return this.repo.create(dto); }

  async update(id: number, dto: UpdateDriverDto) {
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
