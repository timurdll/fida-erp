import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { APPLICATION_REPOSITORY } from '../../domain/application/i-application.repository';
import type { IApplicationRepository, ApplicationFilters } from '../../domain/application/i-application.repository';
import type { ApplicationEntity } from '../../domain/application/application.entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

const VOLUME_EPSILON = 0.001;

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
    const existing = await this.findById(id);
    this.assertTargetVolumeCanBeChanged(existing, dto.targetVolume);

    let statusUpdate = undefined;
    if (dto.targetVolume !== undefined && existing.progress) {
      const shipped = existing.progress.shippedVolume;
      const newTarget = dto.targetVolume;
      
      if (existing.status === 'COMPLETED' && shipped + VOLUME_EPSILON < newTarget) {
        // Reopen application if target volume is increased beyond shipped volume
        statusUpdate = 'IN_PROGRESS';
      } else if (existing.status === 'IN_PROGRESS' && shipped + VOLUME_EPSILON >= newTarget) {
        // Auto-complete if target volume is reduced to shipped volume
        statusUpdate = 'COMPLETED';
      }
    }

    const patch = statusUpdate ? { ...dto, status: statusUpdate as any } : dto;
    return this.repo.update(id, patch);
  }

  async complete(id: number) {
    const application = await this.findById(id);

    if (application.progress) {
      if (application.progress.loadingVolume > VOLUME_EPSILON) {
        throw new BadRequestException('Нельзя завершить досрочно: есть отвесы в процессе погрузки.');
      }
      if (application.progress.shippedVolume < VOLUME_EPSILON) {
        throw new BadRequestException('Нельзя завершить досрочно: нет ни одного завершенного отвеса (отгружено 0 м³).');
      }
    }

    return this.repo.complete(id);
  }

  async deactivate(id: number) {
    await this.findById(id);
    return this.repo.deactivate(id);
  }

  private assertTargetVolumeCanBeChanged(
    application: ApplicationEntity,
    targetVolume?: number,
  ) {
    if (targetVolume === undefined || !application.progress) return;

    const shippedVolume = application.progress.shippedVolume;
    const loadingVolume = application.progress.loadingVolume;
    const usedVolume = shippedVolume + loadingVolume;

    if (targetVolume + VOLUME_EPSILON >= usedVolume) return;

    const details =
      loadingVolume > VOLUME_EPSILON
        ? `Уже отгружено: ${shippedVolume.toFixed(2)} м³, на погрузке: ${loadingVolume.toFixed(2)} м³.`
        : `Уже отгружено: ${shippedVolume.toFixed(2)} м³.`;

    throw new BadRequestException(
      `Нельзя установить объем заявки меньше уже оформленного объема. Минимум: ${usedVolume.toFixed(2)} м³. ${details}`,
    );
  }
}
