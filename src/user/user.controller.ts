import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from 'src/config/auth.guard';

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
  @UseGuards(AuthGuard)
  createUser(@Body() body: any, @Req() req: any) {
    const currentUser = req.user.data.fullName;
    return this.userService.createUser(body, currentUser);
  }

  // ----- EDIT USER ----- //
  @Post('editUser')
  editUser(@Body() body: any, @Req() req: any) {
    const currentUser = req.user.data.fullName;
    return this.userService.editUser(body, currentUser);
  }

  // ----- ĐỔI MẬT KHẨU ----- //
  @Post('changePass')
  changePass(@Body() body: { pass: string }, @Req() req: any) {
    const currentUser = req.user.data.fullName;
    return this.userService.changePass(body, currentUser);
  }

  // ----- TẠM NGƯNG USER ----- //
  @Delete('delUser')
  delUser(@Query('id') id: number, @Req() req: any) {
    const currentUser = req.user.data.fullName;
    return this.userService.delUser(id, currentUser);
  }

  // ----- LẤY THÔNG TIN MỘT USER ----- //
  @Get('getUserInfo')
  getUserInfo(@Query('id') id: number) {
    return this.userService.getUserInfo(id);
  }

  // ----- EDIT THÔNG TIN 1 USER ----- //
  @Post('editUserInfo')
  editUserInfo(@Body() body: any, @Req() req: any) {
    const currentUser = req.user.data.fullName;
    return this.userService.editUserInfo(body, currentUser);
  }

  // ----- LẤY USER DOMAIN ----- //
  @Get('syncUserDomain')
  syncUserDomain() {
    return this.userService.syncUserDomain();
  }
}
