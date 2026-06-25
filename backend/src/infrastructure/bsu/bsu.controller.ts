import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { BsuService } from '../../application/bsu/bsu.service';
import { CreateBsuDto } from '../../application/bsu/dto/create-bsu.dto';
import { UpdateBsuDto } from '../../application/bsu/dto/update-bsu.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('bsu')
export class BsuController {
  constructor(private readonly service: BsuService) {}

  @Get()
  findAll(
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.service.findAll({
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      search,
      companyId: companyId ? Number(companyId) : undefined,
    });
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() dto: CreateBsuDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBsuDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.deactivate(id);
  }
}
