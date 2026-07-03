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
    const existing = await this.findById(id);
    const patch: UpdatePlumbLogDto = { ...dto };
    const applicationChanged =
      dto.applicationId !== undefined && dto.applicationId !== existing.applicationId;

    if (applicationChanged) {
      const application = await this.applicationRepo.findById(dto.applicationId!);
      if (!application) {
        throw new NotFoundException(`Заявка #${dto.applicationId} не найдена`);
      }

      patch.supplierId = application.supplierId;
      patch.customerId = application.customerId;
      patch.materialId = application.materialId;
      patch.objectId = application.objectId;
      if (application.constructionId != null) {
        patch.constructionId = application.constructionId;
      }
      if (application.slumpCone != null) {
        patch.slumpCone = application.slumpCone;
      }
    }

    const updated = await this.repo.update(id, patch);
    if (applicationChanged) {
      await this.syncApplicationStatus(existing.applicationId, { reopen: true });
      await this.syncApplicationStatus(updated.applicationId, { reopen: true });
    }
    return updated;
  }

  async weighTare(id: number, weight: number, operatorId: number) {
    const existing = await this.findById(id);
    if (existing.gross != null && existing.gross <= weight) {
      throw new BadRequestException(
        `Брутто (${existing.gross} кг) должно быть больше тары (${weight} кг). Проверьте введённые значения.`,
      );
    }
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
  private async syncApplicationStatus(
    applicationId: number | null | undefined,
    opts: { reopen?: boolean } = {},
  ) {
    if (applicationId == null) return;

    const application = await this.applicationRepo.findById(applicationId);
    if (!application || !application.progress) return;
    // CANCELLED — финальный статус. COMPLETED открываем заново только при ручной перепривязке.
    if (application.status === ApplicationStatus.CANCELLED) {
      return;
    }
    if (application.status === ApplicationStatus.COMPLETED && !opts.reopen) {
      return;
    }

    if (application.progress.shippedVolume >= application.targetVolume) {
      await this.applicationRepo.updateStatus(applicationId, ApplicationStatus.COMPLETED);
    } else if (
      application.progress.shippedVolume > 0 ||
      application.progress.loadingVolume > 0
    ) {
      await this.applicationRepo.updateStatus(applicationId, ApplicationStatus.IN_PROGRESS);
    } else if (opts.reopen) {
      await this.applicationRepo.updateStatus(applicationId, ApplicationStatus.PENDING);
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
