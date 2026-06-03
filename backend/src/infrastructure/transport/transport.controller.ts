import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TransportService } from '../../application/transport/transport.service';
import { CreateTransportDto } from '../../application/transport/dto/create-transport.dto';
import { UpdateTransportDto } from '../../application/transport/dto/update-transport.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../domain/user/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('transports')
export class TransportController {
  constructor(private readonly service: TransportService) {}

  @Get()
  findAll(
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('carrierId') carrierId?: string,
    @Query('driverId') driverId?: string,
  ) {
    const active = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.service.findAll({
      isActive: active,
      search,
      carrierId: carrierId ? +carrierId : undefined,
      driverId: driverId ? +driverId : undefined,
    });
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.DEPUTY_DIRECTOR)
  @UseGuards(RolesGuard)
  create(@Body() dto: CreateTransportDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.DEPUTY_DIRECTOR)
  @UseGuards(RolesGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTransportDto) {
    return this.service.update(id, dto);
  }

@Patch(':id/activate')
  @Roles(UserRole.ADMIN, UserRole.DEPUTY_DIRECTOR)
  @UseGuards(RolesGuard)
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.service.activate(id);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN, UserRole.DEPUTY_DIRECTOR)
  @UseGuards(RolesGuard)
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.deactivate(id);
  }
}
