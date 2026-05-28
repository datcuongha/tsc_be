import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { syncUsersFromLDAP } from 'src/config/ldap.services';

@Injectable()
export class UserService {
  prisma = new PrismaClient();

  // ----- LẤY THÔNG TIN USER ----- //
  async getAllUser() {
    const content = await this.prisma.users.findMany({
      include: {
        vaiTro: true,
        boPhan: true,
      },
      orderBy: {
        status: 'desc',
      },
      // where: {
      //   status: Boolean('true'),
      // },
    });
    return { message: 'Thành công', content, date: new Date() };
  }

  // ----- TẠO USER ----- //
  async createUser(body: any) {
    const checkUser = await this.prisma.users.findFirst({
      where: {
        AND: [{ userName: body.userName }, { email: body.email }],
      },
    });

    if (checkUser) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: 'Tài khoản này đã tồn tại',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = await this.prisma.users.create({
      data: {
        userName: body.userName,
        pass: bcrypt.hashSync(body.pass, 10),
        email: body.email,
        brithday: body.brithday ? new Date(body.brithday).toISOString() : null,
        phone: body.phone,
        fullName: body.fullName,
        createDate: new Date(),
        status: true,
        address: body.address,
        authType: 'local',
        boPhan: {
          connect: { id: Number(body.boPhan) },
        },
        vaiTro: {
          connect: { id: Number(body.vaiTro) },
        },
      },
    });

    return { message: 'Thành công', data, date: new Date() };
  }

  // ----- EDIT USER ----- //
  async editUser(body: any) {
    const checkUser = await this.prisma.users.findUnique({
      where: {
        userId: body.userId,
      },
    });

    if (!checkUser) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: 'Người dùng không tồn tại',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = await this.prisma.users.update({
      where: {
        userId: body.userId,
      },
      data: {
        fullName: body.fullName,
        userName: body.userName,
        email: body.email,
        brithday: body.brithday || null,
        phone: body.phone || null,
        address: body.address || '',
        status: Boolean(body.status),
        modifiedDate: new Date(),

        vaiTro: {
          connect: {
            id: Number(body.vaiTro),
          },
        },

        boPhan: {
          connect: {
            id: Number(body.boPhan),
          },
        },
      },
    });

    return {
      message: 'Cập nhật thành công',
      data,
    };
  }

  // ----- ĐỔI MẬT KHẨU ----- //
  async changePass(body: any) {
    const checkUser = await this.prisma.users.findFirst({
      where: { userId: body.userId },
    });

    if (!checkUser) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: 'User này không tồn tại',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const passWord = bcrypt.hashSync(body.pass, 10);

    const data = await this.prisma.users.update({
      where: {
        userId: body.userId,
      },
      data: {
        pass: passWord,
        modifiedDate: new Date(),
      },
    });

    return { message: 'Thành công', data, date: new Date() };
  }

  // ----- TẠM NGƯNG USER ----- //
  async delUser(id: number) {
    const checkUser = await this.prisma.users.findFirst({
      where: {
        userId: Number(id),
      },
    });

    if (!checkUser) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: 'User này không tồn tại',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = await this.prisma.users.update({
      where: {
        userId: Number(id),
      },
      data: {
        status: false,
        modifiedDate: new Date(),
      },
    });
    return { message: 'Thành công', data, date: new Date() };
  }

  // ----- LẤY THÔNG TIN MỘT USER ----- //
  async getUserInfo(id: number) {
    const checkUser = await this.prisma.users.findFirst({
      where: {
        userId: Number(id),
      },
    });

    if (!checkUser) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: 'User này không tồn tại',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const content = await this.prisma.users.findFirst({
      where: {
        userId: Number(id),
      },
      include: {
        boPhan: true,
      },
    });
    return { message: 'Thành công', content, date: new Date() };
  }

  // ----- EDIT THÔNG TIN 1 USER ----- //
  async editUserInfo(body: any) {
    const checkUser = await this.prisma.users.findFirst({
      where: {
        userId: body.userId,
      },
    });

    if (!checkUser) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: 'User này không đúng',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = await this.prisma.users.update({
      where: {
        userId: checkUser.userId,
      },
      data: {
        userId: checkUser.userId,
        fullName: body.fullName,
        email: body.email,
        phone: body.phone,
        brithday: body.brithday ? new Date(body.brithday).toISOString() : null,
        address: body.address || null,
      },
    });
    return { message: 'Thành công', data, date: new Date() };
  }

  // ----- LẤY USER DOMAIN ----- //
  async syncUserDomain() {
    try {
      const ldapUsers = await syncUsersFromLDAP();
      let synced = 0;

      for (const u of ldapUsers) {
        const username = u.sAMAccountName || u.samaccountname;

        if (!username) {
          console.log('❌ skip:', u);
          continue;
        }

        console.log('👉 SYNC:', username);

        await this.prisma.users.upsert({
          where: {
            userName: username,
          },
          update: {
            fullName: u.cn || '',
            email: u.mail || '',
          },
          create: {
            userName: username,
            fullName: u.cn || '',
            email: u.mail || '',
            authType: 'domain',
            vaiTroId: 4,
          },
        });

        synced++;
      }

      return {
        message: 'Sync thành công',
        ldapTotal: ldapUsers.length,
        syncedTotal: synced,
      };
    } catch (error) {
      console.log(error);
      throw new Error('Lỗi sync LDAP');
    }
  }
}
