import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
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

  // ----- GÁN DANH SÁCH QUYỀN CHO VAI TRÒ----- //
  @Post('vaiTroPhanQuyen')
  vaiTroPhanQuyen(@Body() body: { vaiTroId: number; phanQuyen: string[] }) {
    return this.vaitroService.vaiTroPhanQuyen(body);
  }

  // ----- LẤY QUYỀN CỦA MỘT VAI TRÒ ----- //
  @Get('getVaiTroPhanQuyen/:vaiTroId')
  getVaiTroPhanQuyen(@Param('vaiTroId', ParseIntPipe) vaiTroId: number) {
    return this.vaitroService.getVaiTroPhanQuyen(vaiTroId);
  }
}
