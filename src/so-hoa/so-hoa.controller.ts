import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { SoHoaService } from './so-hoa.service';

@Controller('api/so-hoa')
export class SoHoaController {
  constructor(private readonly soHoaService: SoHoaService) {}

  // ----- LẤY DANH SÁCH SỐ HOÁ ----- //
  // @Get('getAllSoHoa')
  // getAllSoHoa() {
  //   return this.soHoaService.getAllSoHoa();
  // }
}
