import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TRANSPORT_REPOSITORY } from '../../domain/transport/i-transport.repository';
import type { ITransportRepository, TransportFilters } from '../../domain/transport/i-transport.repository';
import { CreateTransportDto } from './dto/create-transport.dto';
import { UpdateTransportDto } from './dto/update-transport.dto';

@Injectable()
export class TransportService {
  constructor(
    @Inject(TRANSPORT_REPOSITORY)
    private readonly repo: ITransportRepository,
  ) {}

  findAll(filters: TransportFilters = {}) {
    if (filters.isActive === undefined) filters.isActive = true;
    return this.repo.findAll(filters);
  }

  async findById(id: number) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException(`Транспорт #${id} не найден`);
    return item;
  }

  async create(dto: CreateTransportDto) {
    const existing = await this.repo.findAll({ isActive: undefined, search: dto.plateNumber });
    if (existing.some((t) => t.plateNumber === dto.plateNumber)) {
      throw new ConflictException(`Гос. номер "${dto.plateNumber}" уже существует`);
    }
    return this.repo.create(dto);
  }

  async update(id: number, dto: UpdateTransportDto) {
    await this.findById(id);
    const plate = (dto as any).plateNumber as string | undefined;
    if (plate) {
      const existing = await this.repo.findAll({ isActive: undefined, search: plate });
      if (existing.some((t) => t.plateNumber === plate && t.id !== id)) {
        throw new ConflictException(`Гос. номер "${plate}" уже существует`);
      }
    }
    return this.repo.update(id, dto);
  }

  async deactivate(id: number) {
    await this.findById(id);
    return this.repo.deactivate(id);
  }
}
