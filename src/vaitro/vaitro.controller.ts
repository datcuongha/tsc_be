import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { VaitroService } from './vaitro.service';

@Controller('api/vaitro')
export class VaitroController {
  constructor(private readonly vaitroService: VaitroService) {}

  // ----- LẤY THÔNG TIN VAI TRÒ ----- //
  @Get('getAllRole')
  getAllRole() {
    return this.vaitroService.getAllRole();
  }
  // ----- TẠO VAI TRÒ ----- //
  @Post('createRole')
  createRole(@Body() body: any) {
    return this.vaitroService.createRole(body);
  }

  // ----- SỬA THÔNG TIN VAI TRÒ ----- //
  @Post('editRole')
  editRole(@Body() body: any) {
    return this.vaitroService.editRole(body);
  }

  // ----- VAI TRO - PHÂN QUYỀN ----- //
  @Post('vaiTroPhanQuyen')
  vaiTroPhanQuyen(@Body() body: { vaiTroId: number; phanQuyen: string[] }) {
    return this.vaitroService.vaiTroPhanQuyen(body);
  }

  @Get('getVaiTroPhanQuyen')
  getVaiTroPhanQuyen(@Param('vaiTroId') vaiTroId: string) {
    return this.vaitroService.getVaiTroPhanQuyen(+vaiTroId);
  }
}
