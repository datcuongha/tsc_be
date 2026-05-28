import { PartialType } from '@nestjs/mapped-types';
import { CreatePythonDto } from './create-python.dto';

export class UpdatePythonDto extends PartialType(CreatePythonDto) {}
