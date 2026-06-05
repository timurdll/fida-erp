import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { APPLICATION_REPOSITORY } from '../../domain/application/i-application.repository';
import type { IApplicationRepository, ApplicationFilters } from '../../domain/application/i-application.repository';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

@Injectable()
export class ApplicationService {
  constructor(
    @Inject(APPLICATION_REPOSITORY)
    private readonly repo: IApplicationRepository,
  ) {}

  findAll(filters: ApplicationFilters = {}) {
    return this.repo.findAll(filters);
  }

  async findById(id: number) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException(`Заявка #${id} не найдена`);
    return item;
  }

  create(dto: CreateApplicationDto, authorId: number) {
    return this.repo.create({ ...dto, authorId });
  }

  async update(id: number, dto: UpdateApplicationDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async complete(id: number) {
    await this.findById(id);
    return this.repo.complete(id);
  }

  async deactivate(id: number) {
    await this.findById(id);
    return this.repo.deactivate(id);
  }
}
