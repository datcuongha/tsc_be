import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { DatHangService } from './dat-hang.service';

@Controller('api/dat-hang')
export class DatHangController {
  constructor(private readonly datHangService: DatHangService) {}

  // ----- LẤY TÁT CẢ ĐƠN ĐẶT HÀNG ----- //
  @Get('getAllDatHang')
  getAllDatHang(@Req() req: any) {
    const currentUser = req.user.userId;
    return this.datHangService.getAllDatHang(currentUser);
  }

  // ----- CẬP NHẬP THÔNG TIN ĐƠN ĐỀ XUẤT ----- //
  @Post('editDonDeXuat')
  editDonDeXuat(@Body() body: any, @Req() req: any) {
    const currentUser = req.user.fullName;
    return this.datHangService.editDonDeXuat(body, currentUser);
  }

  // ----- PGD DUYỆT SỐ LƯỢNG ----- //
  @Post('editSLPGD')
  editSLPGD(@Body() body: any, @Req() req: any) {
    const currentUser = req.user.userId;
    const fullName = req.user.fullName;
    return this.datHangService.editSLPGD(body, currentUser, fullName);
  }

  // ----- GD DUYỆT SỐ LƯỢNG ----- //
  @Post('editSLGD')
  editSLGD(@Body() body: any, @Req() req: any) {
    const currentUser = req.user.userId;
    const fullName = req.user.fullName;
    return this.datHangService.editSLGD(body, currentUser, fullName);
  }

  // ----- CẬP NHẬT THÔNG TIN TM DUYỆT SỐ LƯỢNG ----- //
  @Post('editDatHangTM')
  editDatHangTM(@Body() body: any, @Req() req: any) {
    const currentUser = req.user.fullName;
    return this.datHangService.editDatHangTM(body, currentUser);
  }

  // ----- CẬP NHẬT THỜI GIAN GIAO HÀNG ----- //
  @Patch(':id/thoiGianGiaoHang')
  updateThoiHan(
    @Param('id') id: number,
    @Body() body: { thoiGianGiaoHang: string },
    @Req() req: any,
  ) {
    const currentUser = req.user.fullName;
    return this.datHangService.updateThoiHan(
      Number(id),
      body.thoiGianGiaoHang,
      currentUser,
    );
  }

  // ----- DUYỆT PHIẾU CẤP 1 ----- //
  @Get('getPhieuById')
  getPhieuById(@Query('id', ParseIntPipe) id: number, @Req() req: any) {
    const currentUser = req.user.userId;
    return this.datHangService.getPhieuById(id, currentUser);
  }

  @Post('xuLyPheDuyet')
  xuLyPheDuyet(@Body() body: any, @Req() req: any) {
    const currentUser = req.user.userId;
    const fullName = req.user.fullName;
    return this.datHangService.xuLyPheDuyet(body, currentUser, fullName);
  }
}
