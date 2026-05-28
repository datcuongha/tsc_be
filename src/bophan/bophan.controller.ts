import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { BophanService } from './bophan.service';

@Controller('api/bophan')
export class BophanController {
  constructor(private readonly bophanService: BophanService) {}

  // ----- LẤY THÔNG TIN BỘ PHẬN ----- //
  @Get('getDataBp')
  getDataBp() {
    return this.bophanService.getDataBp();
  }

  // ----- TẠO BỘ PHẬN ----- //
  @Post('createBp')
  createBp(@Body() body: any) {
    return this.bophanService.createBp(body);
  }

  // ----- SỬA THÔNG TIN BỘ PHẬN ----- //
  @Post('editBp')
  editBp(@Body() body: any) {
    return this.bophanService.editBp(body);
  }

  // ----- TẠM NGƯNG BỘ PHẬN ----- //
  @Delete('delBp')
  delBp(@Query('id') id: number) {
    return this.bophanService.delBp(id);
  }
}
