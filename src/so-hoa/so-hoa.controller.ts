import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
} from '@nestjs/common';
import { SoHoaService } from './so-hoa.service';

@Controller('api/so-hoa')
export class SoHoaController {
  constructor(private readonly soHoaService: SoHoaService) {}

  // ----- LẤY DANH SÁCH SỐ HOÁ ----- //
  @Get('getAllSoHoa')
  getAllSoHoa() {
    return this.soHoaService.getAllSoHoa();
  }

  // ----- TẠO TÀI LIỆU SỐ HOÁ ----- //
  @Post('createSoHoa')
  createSoHoa(@Body() body: any, @Req() req: any) {
    const currentUser = req.user.data.userId;
    return this.soHoaService.createSoHoa(body, currentUser);
  }
}
