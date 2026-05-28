// import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Put } from '@nestjs/common';
// import { SkuService } from './sku.service';
// import { CreateSkuDto } from './dto/create-sku.dto';
// import { UpdateSkuDto } from './dto/update-sku.dto';


// @Controller('api/sku')
// export class SkuController {
//   constructor(private readonly skuService: SkuService) { }

//   // ----- LẤY DANH MỤC HÀNG HÓA ----- //
//   @Get('LayDanhSachSku')
//   LayDanhSachSku() {
//     return this.skuService.LayDanhSachSku();
//   }

//   // ----- TẠO MÃ SKU ----- //
//   @Post('TaoSku')
//   TaoSku(@Body() body: any) {
//     return this.skuService.TaoSku(body);
//   }

//   // ----- Import SKU ----- //
//   @Post('ImportSku')
//   ImportSku(@Body() body: any) {
//     return this.skuService.ImportSku(body);
//   }

//   // ----- XÓA SKU ----- //
//   @Delete('XoaSku')
//   XoaSku(@Query('id') id: string) {
//     return this.skuService.XoaSku(+id)
//   }

//   // ----- CẬP NHẬT SKU ----- //
//   @Post('UpdateSku')
//   UpdataSku(@Body() body: any) {
//     return this.skuService.UpdateSku(body)
//   }

//   // ----- CẬT NHẬT VỐN ----- //
//   @Put('UpdateVonSku')
//   UpdateVonSku(@Query('id') id: string, @Body() body: any) {
//     return this.skuService.UpdateVonSku(+id, body)
//   }
// }
