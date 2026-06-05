import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApplicationService } from '../../application/application/application.service';
import { CreateApplicationDto } from '../../application/application/dto/create-application.dto';
import { UpdateApplicationDto } from '../../application/application/dto/update-application.dto';
import { ApplicationStatus } from '../../domain/application/application.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../domain/user/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationController {
  constructor(private readonly service: ApplicationService) {}

  @Get()
  findAll(
    @Query('deliveryDate') deliveryDate?: string,
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
    @Query('customerId') customerId?: string,
    @Query('materialId') materialId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.findAll({
      deliveryDate,
      status: status as ApplicationStatus | undefined,
      supplierId: supplierId ? Number(supplierId) : undefined,
      customerId: customerId ? Number(customerId) : undefined,
      materialId: materialId ? Number(materialId) : undefined,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.DEPUTY_DIRECTOR, UserRole.SALES_HEAD, UserRole.MANAGER)
  @UseGuards(RolesGuard)
  create(@Body() dto: CreateApplicationDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.DEPUTY_DIRECTOR, UserRole.SALES_HEAD, UserRole.MANAGER)
  @UseGuards(RolesGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.service.update(id, dto);
  }

  @Patch(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.DEPUTY_DIRECTOR, UserRole.DISPATCHER)
  @UseGuards(RolesGuard)
  complete(@Param('id', ParseIntPipe) id: number) {
    return this.service.complete(id);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN, UserRole.DEPUTY_DIRECTOR)
  @UseGuards(RolesGuard)
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.deactivate(id);
  }
}
