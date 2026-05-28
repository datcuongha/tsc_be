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
import { DashboardAdminService } from './dashboard-admin.service';
@Controller('api/dashboardAdmin')
export class DashboardAdminController {
  constructor(private readonly dashboardAdminService: DashboardAdminService) {}

  // ----- LẤY THÔNG TIN LINK BI ----- //
  @Get('getAllDashboardAdmin')
  getAllDashboardAdmin() {
    return this.dashboardAdminService.getAllDashboardAdmin();
  }

  // ----- TẠO LINK BI ----- //
  @Post('createDashboardLink')
  createDashboardLink(@Body() body: any) {
    return this.dashboardAdminService.createDashboardLink(body);
  }

  // ----- EDIT LINK BI ----- //
  @Post('editDashboardLink')
  editDashboardLink(@Body() body: any) {
    return this.dashboardAdminService.editDashboardLink(body);
  }

  // ----- DEL LINK BI ----- //
  @Delete('delDashboardLink')
  delDashboardLink(@Query('id') id: number) {
    return this.dashboardAdminService.delDashboardLink(id);
  }
}
