import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CARRIER_REPOSITORY } from '../../domain/carrier/i-carrier.repository';
import type { ICarrierRepository, CarrierFilters } from '../../domain/carrier/i-carrier.repository';
import { CreateCarrierDto } from './dto/create-carrier.dto';
import { UpdateCarrierDto } from './dto/update-carrier.dto';

@Injectable()
export class CarrierService {
  constructor(
    @Inject(CARRIER_REPOSITORY)
    private readonly repo: ICarrierRepository,
  ) {}

  findAll(filters: CarrierFilters = {}) {
    if (filters.isActive === undefined) filters.isActive = true;
    return this.repo.findAll(filters);
  }

  async findById(id: number) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException(`Перевозчик #${id} не найден`);
    return item;
  }

  create(dto: CreateCarrierDto) { return this.repo.create(dto); }

  async update(id: number, dto: UpdateCarrierDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async deactivate(id: number) {
    await this.findById(id);
    return this.repo.deactivate(id);
  }
}
