import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
// import { SkuModule } from './sku/sku.module';
import { ConfigModule } from '@nestjs/config';
// import { NccModule } from './ncc/ncc.module';
// import { NhomlvModule } from './nhomlv/nhomlv.module';
// import { Lv1Module } from './lv1/lv1.module';
// import { Lv2Module } from './lv2/lv2.module';
import { InvoiceItModule } from './invoice-it/invoice-it.module';
import { DashboardAdminModule } from './dashboard-admin/dashboard-admin.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { BophanModule } from './bophan/bophan.module';
import { VaitroModule } from './vaitro/vaitro.module';
import { PhanquyenModule } from './phanquyen/phanquyen.module';
import { PythonModule } from './python/python.module';
import { DatHangModule } from './dat-hang/dat-hang.module';
import { SoHoaModule } from './so-hoa/so-hoa.module';
import { HistoryModule } from './history/history.module';
@Module({
  imports: [
    UserModule,
    AuthModule,
    // NccModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // NhomlvModule,
    InvoiceItModule,
    DashboardAdminModule,
    BophanModule,
    // ServeStaticModule.forRoot({
    //   rootPath: '/Volumes/FILESCAN',
    //   serveRoot: '/uploads',
    // }),
    //server linux
    ServeStaticModule.forRoot({
      rootPath: '/usr/share/be/uploads',
      serveRoot: '/files',
    }),
    VaitroModule,
    PhanquyenModule,
    PythonModule,
    DatHangModule,
    SoHoaModule,
    HistoryModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
