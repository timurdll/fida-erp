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
import { PlumbLogService } from '../../application/plumb-log/plumb-log.service';
import { CreatePlumbLogDto } from '../../application/plumb-log/dto/create-plumb-log.dto';
import { UpdatePlumbLogDto } from '../../application/plumb-log/dto/update-plumb-log.dto';
import { WeighDto } from '../../application/plumb-log/dto/weigh.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('plumb-logs')
export class PlumbLogController {
  constructor(private readonly service: PlumbLogService) {}

  @Get()
  findAll(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('isActive') isActive?: string,
    @Query('isReturn') isReturn?: string,
    @Query('supplierId') supplierId?: string,
    @Query('customerId') customerId?: string,
    @Query('materialId') materialId?: string,
    @Query('applicationId') applicationId?: string,
    @Query('standalone') standalone?: string,
  ) {
    return this.service.findAll({
      dateFrom,
      dateTo,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      isReturn: isReturn === 'true' ? true : isReturn === 'false' ? false : undefined,
      supplierId: supplierId ? Number(supplierId) : undefined,
      customerId: customerId ? Number(customerId) : undefined,
      materialId: materialId ? Number(materialId) : undefined,
      applicationId: applicationId ? Number(applicationId) : undefined,
      standalone: standalone === 'true' ? true : undefined,
    });
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() dto: CreatePlumbLogDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePlumbLogDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/weigh-tare')
  weighTare(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: WeighDto,
    @CurrentUser() user: any,
  ) {
    return this.service.weighTare(id, dto.weight, user.id);
  }

  @Patch(':id/weigh-gross')
  weighGross(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: WeighDto,
    @CurrentUser() user: any,
  ) {
    return this.service.weighGross(id, dto.weight, user.id);
  }

  @Post(':id/return')
  createReturn(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.createReturn(id, user.id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.deactivate(id);
  }
}
