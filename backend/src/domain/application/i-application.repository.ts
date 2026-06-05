import type { ApplicationEntity, ApplicationStatus } from './application.entity';
import type { CreateApplicationDto } from '../../application/application/dto/create-application.dto';
import type { UpdateApplicationDto } from '../../application/application/dto/update-application.dto';

export const APPLICATION_REPOSITORY = 'APPLICATION_REPOSITORY';

export interface ApplicationFilters {
  deliveryDate?: string; // YYYY-MM-DD, defaults to today
  status?: ApplicationStatus;
  supplierId?: number;
  customerId?: number;
  materialId?: number;
  isActive?: boolean;
}

export interface IApplicationRepository {
  findAll(filters: ApplicationFilters): Promise<ApplicationEntity[]>;
  findById(id: number): Promise<ApplicationEntity | null>;
  create(data: CreateApplicationDto & { authorId: number }): Promise<ApplicationEntity>;
  update(id: number, data: UpdateApplicationDto): Promise<ApplicationEntity>;
  complete(id: number): Promise<ApplicationEntity>;
  deactivate(id: number): Promise<ApplicationEntity>;
}
