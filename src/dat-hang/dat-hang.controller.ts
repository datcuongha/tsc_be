import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { DatHangService } from './dat-hang.service';

@Controller('api/dat-hang')
export class DatHangController {
  constructor(private readonly datHangService: DatHangService) {}

  // ----- LẤY TÁT CẢ ĐƠN ĐẶT HÀNG ----- //
  @Get('getAllDatHang')
  getAllDatHang() {
    return this.datHangService.getAllDatHang();
  }

  // ----- CẬP NHẬP THÔNG TIN ĐƠN ĐỀ XUẤT ----- //
  @Post('editDonDeXuat')
  editDonDeXuat(@Body() body: any, @Req() req: any) {
    const currentUser = req.user.data.fullName;
    return this.datHangService.editDonDeXuat(body, currentUser);
  }

  // ----- CẬP NHẬT THÔNG TIN TM DUYỆT SỐ LƯỢNG ----- //
  @Post('editDatHangTM')
  editDatHangTM(@Body() body: any, @Req() req: any) {
    const currentUser = req.user.data.fullName;
    return this.datHangService.editDatHangTM(body, currentUser);
  }
}
