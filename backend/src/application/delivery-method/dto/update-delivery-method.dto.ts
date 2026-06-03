import { PartialType } from '@nestjs/mapped-types';
import { CreateDeliveryMethodDto } from './create-delivery-method.dto';

export class UpdateDeliveryMethodDto extends PartialType(CreateDeliveryMethodDto) {}
