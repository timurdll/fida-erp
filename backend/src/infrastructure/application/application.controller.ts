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
import { CurrentUser } from '../auth/decorators/current-user.decorator';

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
  create(@Body() dto: CreateApplicationDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.service.update(id, dto);
  }

  @Patch(':id/complete')
  complete(@Param('id', ParseIntPipe) id: number) {
    return this.service.complete(id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.deactivate(id);
  }
}
