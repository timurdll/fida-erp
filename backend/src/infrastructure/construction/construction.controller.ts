import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ConstructionService } from '../../application/construction/construction.service';
import { CreateConstructionDto } from '../../application/construction/dto/create-construction.dto';
import { UpdateConstructionDto } from '../../application/construction/dto/update-construction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../domain/user/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('constructions')
export class ConstructionController {
  constructor(private readonly service: ConstructionService) {}

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
  create(@Body() dto: CreateConstructionDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.DEPUTY_DIRECTOR)
  @UseGuards(RolesGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateConstructionDto) {
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
