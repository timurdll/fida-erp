import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DELIVERY_METHOD_REPOSITORY } from '../../domain/delivery-method/i-delivery-method.repository';
import type { IDeliveryMethodRepository, DeliveryMethodFilters } from '../../domain/delivery-method/i-delivery-method.repository';
import { CreateDeliveryMethodDto } from './dto/create-delivery-method.dto';
import { UpdateDeliveryMethodDto } from './dto/update-delivery-method.dto';

@Injectable()
export class DeliveryMethodService {
  constructor(
    @Inject(DELIVERY_METHOD_REPOSITORY)
    private readonly repo: IDeliveryMethodRepository,
  ) {}

  findAll(filters: DeliveryMethodFilters = {}) {
    if (filters.isActive === undefined) filters.isActive = true;
    return this.repo.findAll(filters);
  }

  async findById(id: number) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException(`Способ приёмки #${id} не найден`);
    return item;
  }

  create(dto: CreateDeliveryMethodDto) { return this.repo.create(dto); }

  async update(id: number, dto: UpdateDeliveryMethodDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async deactivate(id: number) {
    await this.findById(id);
    return this.repo.deactivate(id);
  }
}
