import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { DeliveryMethodService } from '../../application/delivery-method/delivery-method.service';
import { CreateDeliveryMethodDto } from '../../application/delivery-method/dto/create-delivery-method.dto';
import { UpdateDeliveryMethodDto } from '../../application/delivery-method/dto/update-delivery-method.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../domain/user/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('delivery-methods')
export class DeliveryMethodController {
  constructor(private readonly service: DeliveryMethodService) {}

  @Get()
  findAll(@Query('isActive') isActive?: string, @Query('search') search?: string) {
    const active = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.service.findAll({ isActive: active, search });
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.DEPUTY_DIRECTOR)
  @UseGuards(RolesGuard)
  create(@Body() dto: CreateDeliveryMethodDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.DEPUTY_DIRECTOR)
  @UseGuards(RolesGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDeliveryMethodDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN, UserRole.DEPUTY_DIRECTOR)
  @UseGuards(RolesGuard)
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.deactivate(id);
  }
}
