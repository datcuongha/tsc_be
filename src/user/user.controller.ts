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
import { UserService } from './user.service';

@Controller('api/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ----- LẤY THÔNG TIN USER ----- //
  @Get('getAllUser')
  getAllUser() {
    return this.userService.getAllUser();
  }

  // ----- TẠO USER ----- //
  @Post('createUser')
  createUser(@Body() body: any) {
    return this.userService.createUser(body);
  }

  // ----- EDIT USER ----- //
  @Post('editUser')
  editUser(@Body() body: any) {
    return this.userService.editUser(body);
  }

  // ----- ĐỔI MẬT KHẨU ----- //
  @Post('changePass')
  changePass(@Body() body: { pass: string }) {
    return this.userService.changePass(body);
  }

  // ----- TẠM NGƯNG USER ----- //
  @Delete('delUser')
  delUser(@Query('id') id: number) {
    return this.userService.delUser(id);
  }

  // ----- LẤY THÔNG TIN MỘT USER ----- //
  @Get('getUserInfo')
  getUserInfo(@Query('id') id: number) {
    return this.userService.getUserInfo(id);
  }

  // ----- EDIT THÔNG TIN 1 USER ----- //
  @Post('editUserInfo')
  editUserInfo(@Body() body: any) {
    return this.userService.editUserInfo(body);
  }

  // ----- LẤY USER DOMAIN ----- //
  @Get('syncUserDomain')
  syncUserDomain() {
    return this.userService.syncUserDomain();
  }
}
