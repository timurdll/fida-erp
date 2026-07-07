import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PLUMB_LOG_REPOSITORY } from '../../domain/plumb-log/i-plumb-log.repository';
import type { IPlumbLogRepository, PlumbLogFilters } from '../../domain/plumb-log/i-plumb-log.repository';
import { APPLICATION_REPOSITORY } from '../../domain/application/i-application.repository';
import type { IApplicationRepository } from '../../domain/application/i-application.repository';
import { ApplicationStatus } from '../../domain/application/application.entity';
import type { ApplicationEntity } from '../../domain/application/application.entity';
import { CreatePlumbLogDto } from './dto/create-plumb-log.dto';
import { UpdatePlumbLogDto } from './dto/update-plumb-log.dto';

const VOLUME_EPSILON = 0.001;

type CurrentPlumbVolume = {
  applicationId: number | null;
  volume: number | null;
  isActive: boolean;
  isReturn: boolean;
};

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

  async create(dto: CreatePlumbLogDto, operatorId: number) {
    if (dto.applicationId != null) {
      const application = await this.getApplicationOrThrow(dto.applicationId);
      if (dto.volume != null) {
        this.assertApplicationVolumeCapacity(application, dto.volume);
      }
    }
    return this.repo.create({ ...dto, firstOperatorId: operatorId });
  }

  async update(id: number, dto: UpdatePlumbLogDto) {
    const existing = await this.findById(id);
    this.assertWeighingTimes(existing, dto);
    const patch: UpdatePlumbLogDto = { ...dto };
    const applicationChanged =
      dto.applicationId !== undefined && dto.applicationId !== existing.applicationId;
    const volumeChanged = dto.volume !== undefined && dto.volume !== existing.volume;
    const nextApplicationId =
      dto.applicationId !== undefined ? dto.applicationId : existing.applicationId;
    const nextVolume = dto.volume !== undefined ? dto.volume : existing.volume;
    let linkedApplication: ApplicationEntity | null = null;

    if (
      existing.isActive &&
      !existing.isReturn &&
      nextApplicationId != null &&
      nextVolume != null &&
      (applicationChanged || volumeChanged)
    ) {
      linkedApplication = await this.getApplicationOrThrow(nextApplicationId);
      this.assertApplicationVolumeCapacity(linkedApplication, nextVolume, existing);
    }

    if (applicationChanged && nextApplicationId != null) {
      const application =
        linkedApplication ?? (await this.getApplicationOrThrow(nextApplicationId));

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
    await this.syncApplicationStatus(updated.applicationId, { reopen: true });
    if (applicationChanged) {
      await this.syncApplicationStatus(existing.applicationId, { reopen: true });
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

  private async getApplicationOrThrow(id: number): Promise<ApplicationEntity> {
    const application = await this.applicationRepo.findById(id);
    if (!application) {
      throw new NotFoundException(`Заявка #${id} не найдена`);
    }
    return application;
  }

  private assertWeighingTimes(
    existing: { applicationId: number | null; tare: number | null; gross: number | null; firstWeighingAt: Date | null; secondWeighingAt: Date | null },
    dto: UpdatePlumbLogDto,
  ) {
    if (dto.firstWeighingAt !== undefined && existing.tare == null) {
      throw new BadRequestException(
        'Нельзя изменить время первого взвешивания (тара): вес тары не сохранён.',
      );
    }
    if (dto.secondWeighingAt !== undefined && existing.gross == null) {
      throw new BadRequestException(
        'Нельзя изменить время второго взвешивания (брутто): вес брутто не сохранён.',
      );
    }

    const first =
      dto.firstWeighingAt !== undefined
        ? new Date(dto.firstWeighingAt)
        : existing.firstWeighingAt;
    const second =
      dto.secondWeighingAt !== undefined
        ? new Date(dto.secondWeighingAt)
        : existing.secondWeighingAt;

    if (!first || !second) return;

    const isMaterial = existing.applicationId == null;
    if (isMaterial) {
      if (second.getTime() > first.getTime()) {
        throw new BadRequestException(
          'Для сырья время взвешивания брутто должно быть не позже времени взвешивания тары.',
        );
      }
      return;
    }

    if (first.getTime() > second.getTime()) {
      throw new BadRequestException(
        'Время взвешивания тары должно быть не позже времени взвешивания брутто.',
      );
    }
  }

  private assertApplicationVolumeCapacity(
    application: ApplicationEntity,
    requestedVolume: number,
    current?: CurrentPlumbVolume,
  ) {
    if (!application.progress) return;

    const usedVolume =
      application.progress.shippedVolume + application.progress.loadingVolume;
    const shouldExcludeCurrent =
      current?.applicationId === application.id && current.isActive && !current.isReturn;
    const usedWithoutCurrent = shouldExcludeCurrent
      ? usedVolume - (current.volume ?? 0)
      : usedVolume;
    const remaining = application.targetVolume - usedWithoutCurrent;

    if (requestedVolume > remaining + VOLUME_EPSILON) {
      throw new BadRequestException(
        `Превышение объема заявки. Доступно: ${Math.max(0, remaining).toFixed(2)} м³, запрошено: ${requestedVolume} м³.`,
      );
    }
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

    if (application.progress.shippedVolume + 0.001 >= application.targetVolume) {
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
