import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PLUMB_LOG_REPOSITORY } from '../../domain/plumb-log/i-plumb-log.repository';
import type { IPlumbLogRepository, PlumbLogFilters } from '../../domain/plumb-log/i-plumb-log.repository';
import { APPLICATION_REPOSITORY } from '../../domain/application/i-application.repository';
import type { IApplicationRepository } from '../../domain/application/i-application.repository';
import { ApplicationStatus } from '../../domain/application/application.entity';
import { CreatePlumbLogDto } from './dto/create-plumb-log.dto';
import { UpdatePlumbLogDto } from './dto/update-plumb-log.dto';

@Injectable()
export class PlumbLogService {
  constructor(
    @Inject(PLUMB_LOG_REPOSITORY)
    private readonly repo: IPlumbLogRepository,
    @Inject(APPLICATION_REPOSITORY)
    private readonly applicationRepo: IApplicationRepository,
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
    const weighed = await this.repo.weighTare(id, weight, operatorId);
    // Начало взвешивания первого отвеса переводит заявку PENDING → IN_PROGRESS
    // (gross ещё null, поэтому до COMPLETED здесь дело не дойдёт).
    await this.syncApplicationStatus(weighed.applicationId);
    return weighed;
  }

  async weighGross(id: number, weight: number, operatorId: number) {
    const existing = await this.findById(id);
    if (existing.tare != null && weight <= existing.tare) {
      throw new BadRequestException(
        `Брутто (${weight} кг) должно быть больше тары (${existing.tare} кг). Проверьте введённые значения.`,
      );
    }
    const weighed = await this.repo.weighGross(id, weight, operatorId);
    await this.syncApplicationStatus(weighed.applicationId);
    return weighed;
  }

  // Автопереход статуса заявки после завершённого взвешивания отвеса.
  private async syncApplicationStatus(applicationId: number | null | undefined) {
    if (applicationId == null) return;

    const application = await this.applicationRepo.findById(applicationId);
    if (!application || !application.progress) return;
    // COMPLETED/CANCELLED — финальные, не трогаем (после завершения мог добавиться возврат).
    if (
      application.status === ApplicationStatus.COMPLETED ||
      application.status === ApplicationStatus.CANCELLED
    ) {
      return;
    }

    // progress.shippedVolume пересчитан findById после записи текущего gross.
    if (application.progress.shippedVolume >= application.targetVolume) {
      await this.applicationRepo.updateStatus(applicationId, ApplicationStatus.COMPLETED);
    } else if (application.status === ApplicationStatus.PENDING) {
      await this.applicationRepo.updateStatus(applicationId, ApplicationStatus.IN_PROGRESS);
    }
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
