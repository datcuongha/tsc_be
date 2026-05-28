import { PartialType } from '@nestjs/mapped-types';
import { CreateBophanDto } from './create-bophan.dto';

export class UpdateBophanDto extends PartialType(CreateBophanDto) {}
