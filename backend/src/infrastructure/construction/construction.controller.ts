import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ConstructionService } from '../../application/construction/construction.service';
import { CreateConstructionDto } from '../../application/construction/dto/create-construction.dto';
import { UpdateConstructionDto } from '../../application/construction/dto/update-construction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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
  create(@Body() dto: CreateConstructionDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateConstructionDto) {
    return this.service.update(id, dto);
  }

@Patch(':id/activate')
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.service.activate(id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.deactivate(id);
  }
}
