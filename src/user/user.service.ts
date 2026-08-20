import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
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
  // async createUser(body: any, currentUser: string) {
  //   const checkUserName = await this.prisma.users.findFirst({
  //     where: {
  //       userName: body.userName,
  //     },
  //   });

  //   if (checkUserName) {
  //     throw new BadRequestException('Tên đăng nhập đã tồn tại');
  //   }

  //   const checkEmail = await this.prisma.users.findFirst({
  //     where: {
  //       email: body.email,
  //     },
  //   });

  //   if (checkEmail) {
  //     throw new BadRequestException('Email đã tồn tại');
  //   }

  //   const data = await this.prisma.users.create({
  //     data: {
  //       userName: body.userName,
  //       pass: bcrypt.hashSync(body.pass, 10),
  //       email: body.email,
  //       brithday: body.brithday ? new Date(body.brithday).toISOString() : null,
  //       phone: body.phone,
  //       fullName: body.fullName,
  //       createDate: new Date(),
  //       status: true,
  //       address: body.address,
  //       authType: 'local',
  //       ...(body.managerId
  //         ? {
  //             manager: {
  //               connect: {
  //                 userId: Number(body.managerId),
  //               },
  //             },
  //           }
  //         : {}),
  //       boPhan: {
  //         connect: { id: Number(body.boPhan) },
  //       },
  //       vaiTro: {
  //         connect: { id: Number(body.vaiTro) },
  //       },
  //     },
  //     include: {
  //       boPhan: true,
  //       vaiTro: true,
  //     },
  //   });

  //   await this.prisma.history.create({
  //     data: {
  //       userEdit: currentUser,
  //       module: 'USER',
  //       action: 'TẠO',
  //       recordId: String(data.userId),
  //       description: `Tạo người dùng ${data.userName},bộ phận ${data.boPhan?.name}, vai trò ${data.vaiTro?.name}`,
  //       newData: {
  //         userName: data.userName,
  //         vaiTroId: data.vaiTroId,
  //         vaiTro: data.vaiTro?.name,
  //         boPhanId: data.boPhanId,
  //         boPhan: data.boPhan?.name,
  //       },
  //     },
  //   });
  //   return { message: 'Thành công', data, date: new Date() };
  // }
  async createUser(body: any, currentUser: string) {
    const checkUserName = await this.prisma.users.findFirst({
      where: {
        userName: body.userName,
      },
    });

    if (checkUserName) {
      throw new BadRequestException('Tên đăng nhập đã tồn tại');
    }

    const checkEmail = await this.prisma.users.findFirst({
      where: {
        email: body.email,
      },
    });

    if (checkEmail) {
      throw new BadRequestException('Email đã tồn tại');
    }

    const data = await this.prisma.users.create({
      data: {
        userName: body.userName,
        pass: bcrypt.hashSync(body.pass, 10),
        email: body.email,

        brithday: body.brithday ? new Date(body.brithday) : null,

        phone: body.phone || null,
        fullName: body.fullName,
        createDate: new Date(),
        status: true,
        address: body.address || '',
        authType: 'local',

        managerId: body.managerId ? Number(body.managerId) : null,

        boPhanId: Number(body.boPhan),

        vaiTroId: Number(body.vaiTro),
      },
    });

    const boPhan = data.boPhanId
      ? await this.prisma.boPhan.findUnique({
          where: {
            id: data.boPhanId,
          },
        })
      : null;

    const vaiTro = data.vaiTroId
      ? await this.prisma.vaiTro.findUnique({
          where: {
            id: data.vaiTroId,
          },
        })
      : null;

    await this.prisma.history.create({
      data: {
        userEdit: currentUser,
        module: 'USER',
        action: 'TẠO',
        recordId: String(data.userId),

        description:
          `Tạo người dùng ${data.userName}, ` +
          `bộ phận ${boPhan?.name ?? ''}, ` +
          `vai trò ${vaiTro?.name ?? ''}`,

        newData: {
          userName: data.userName,
          fullName: data.fullName,
          email: data.email,

          vaiTroId: data.vaiTroId,
          vaiTro: vaiTro?.name,

          boPhanId: data.boPhanId,
          boPhan: boPhan?.name,

          managerId: data.managerId,
        },
      },
    });

    return {
      message: 'Thành công',
      data,
      date: new Date(),
    };
  }

  // ----- EDIT USER ----- //
  // async editUser(body: any, currentUser: string) {
  //   const checkUser = await this.prisma.users.findUnique({
  //     where: {
  //       userId: body.userId,
  //     },
  //     include: {
  //       vaiTro: true,
  //       boPhan: true,
  //       manager: true,
  //     },
  //   });

  //   if (!checkUser) {
  //     throw new HttpException(
  //       {
  //         status: HttpStatus.BAD_REQUEST,
  //         message: 'Người dùng không tồn tại',
  //       },
  //       HttpStatus.BAD_REQUEST,
  //     );
  //   }
  //   const data = await this.prisma.users.update({
  //     where: {
  //       userId: body.userId,
  //     },
  //     data: {
  //       fullName: body.fullName,
  //       userName: body.userName,
  //       email: body.email,
  //       brithday: body.brithday ? new Date(body.brithday) : null,
  //       phone: body.phone || null,
  //       address: body.address || '',
  //       status: Boolean(body.status),
  //       modifiedDate: new Date(),

  //       manager: body.managerId
  //         ? {
  //             connect: {
  //               userId: Number(body.managerId),
  //             },
  //           }
  //         : {
  //             disconnect: true,
  //           },

  //       vaiTro: {
  //         connect: {
  //           id: Number(body.vaiTro),
  //         },
  //       },

  //       boPhan: {
  //         connect: {
  //           id: Number(body.boPhan),
  //         },
  //       },
  //     },

  //     include: {
  //       vaiTro: true,
  //       boPhan: true,
  //       manager: true,
  //     },
  //   });

  //   const changes: string[] = [];

  //   if (checkUser.fullName !== data.fullName) {
  //     changes.push(`Họ tên: "${checkUser.fullName}" → "${data.fullName}"`);
  //   }

  //   if (checkUser.userName !== data.userName) {
  //     changes.push(
  //       `Tên đăng nhập: "${checkUser.userName}" → "${data.userName}"`,
  //     );
  //   }

  //   if (checkUser.email !== data.email) {
  //     changes.push(`Email: "${checkUser.email}" → "${data.email}"`);
  //   }

  //   if (checkUser.phone !== data.phone) {
  //     changes.push(`SĐT: "${checkUser.phone ?? ''}" → "${data.phone ?? ''}"`);
  //   }

  //   if (checkUser.brithday !== data.brithday) {
  //     changes.push(
  //       `Ngày sinh: "${checkUser.brithday ?? ''}" → "${data.brithday ?? ''}"`,
  //     );
  //   }
  //   if (checkUser.address !== data.address) {
  //     changes.push(
  //       `Địa chỉ: "${checkUser.address ?? ''}" → "${data.address ?? ''}"`,
  //     );
  //   }

  //   if (checkUser.vaiTro?.name !== data.vaiTro?.name) {
  //     changes.push(
  //       `Vai trò: "${checkUser.vaiTro?.name}" → "${data.vaiTro?.name}"`,
  //     );
  //   }

  //   if (checkUser.boPhan?.name !== data.boPhan?.name) {
  //     changes.push(
  //       `Bộ phận: "${checkUser.boPhan?.name}" → "${data.boPhan?.name}"`,
  //     );
  //   }

  //   if (checkUser.manager?.userId !== data.manager?.userId) {
  //     changes.push(
  //       `Quản lý: "${checkUser.manager?.fullName ?? 'Không có'}" → "${data.manager?.fullName ?? 'Không có'}"`,
  //     );
  //   }

  //   if (checkUser.status !== data.status) {
  //     changes.push(`Trạng thái: "${checkUser.status}" → "${data.status}"`);
  //   }

  //   await this.prisma.history.create({
  //     data: {
  //       userEdit: currentUser,
  //       module: 'USER',
  //       action: 'CẬP NHẬT',
  //       recordId: String(data.userId),
  //       description:
  //         changes.length > 0
  //           ? `Cập nhật người dùng ${data.userName}: ${changes.join(', ')}`
  //           : `Cập nhật người dùng ${data.userName}`,

  //       oldData: {
  //         userName: checkUser.userName,
  //         fullName: checkUser.fullName,
  //         email: checkUser.email,
  //         phone: checkUser.phone,
  //         brithday: checkUser.brithday,
  //         address: checkUser.address,
  //         vaiTro: checkUser.vaiTro?.name,
  //         boPhan: checkUser.boPhan?.name,

  //         managerId: checkUser.managerId,
  //         manager: checkUser.manager?.fullName,
  //       },

  //       newData: {
  //         userName: data.userName,
  //         fullName: data.fullName,
  //         email: data.email,
  //         phone: data.phone,
  //         brithday: checkUser.brithday,
  //         address: data.address,
  //         vaiTro: data.vaiTro?.name,
  //         boPhan: data.boPhan?.name,

  //         managerId: checkUser.managerId,
  //         manager: checkUser.manager?.fullName,
  //       },
  //     },
  //   });

  //   return {
  //     message: 'Cập nhật thành công',
  //     data,
  //   };
  // }
  async editUser(body: any, currentUser: string) {
    // =================================================
    // Kiểm tra user tồn tại
    // =================================================
    const checkUser = await this.prisma.users.findUnique({
      where: {
        userId: Number(body.userId),
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

    // =================================================
    // Không cho chọn chính mình làm quản lý
    // =================================================
    if (body.managerId && Number(body.managerId) === Number(body.userId)) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: 'Không thể chọn chính mình làm quản lý',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // =================================================
    // Lấy thông tin cũ để ghi history
    // =================================================
    const oldVaiTro = checkUser.vaiTroId
      ? await this.prisma.vaiTro.findUnique({
          where: {
            id: checkUser.vaiTroId,
          },
        })
      : null;

    const oldBoPhan = checkUser.boPhanId
      ? await this.prisma.boPhan.findUnique({
          where: {
            id: checkUser.boPhanId,
          },
        })
      : null;

    const oldManager = checkUser.managerId
      ? await this.prisma.users.findUnique({
          where: {
            userId: checkUser.managerId,
          },
          select: {
            userId: true,
            fullName: true,
          },
        })
      : null;

    // =================================================
    // Update user
    // =================================================
    const data = await this.prisma.users.update({
      where: {
        userId: Number(body.userId),
      },

      data: {
        fullName: body.fullName,
        userName: body.userName,
        email: body.email,

        brithday: body.brithday ? new Date(body.brithday) : null,

        phone: body.phone || null,

        address: body.address || '',

        status: Boolean(body.status),

        modifiedDate: new Date(),

        // FK trực tiếp
        vaiTroId: Number(body.vaiTro),

        boPhanId: Number(body.boPhan),

        managerId: body.managerId ? Number(body.managerId) : null,
      },
    });

    // =================================================
    // Lấy thông tin mới sau update
    // =================================================
    const newVaiTro = data.vaiTroId
      ? await this.prisma.vaiTro.findUnique({
          where: {
            id: data.vaiTroId,
          },
        })
      : null;

    const newBoPhan = data.boPhanId
      ? await this.prisma.boPhan.findUnique({
          where: {
            id: data.boPhanId,
          },
        })
      : null;

    const newManager = data.managerId
      ? await this.prisma.users.findUnique({
          where: {
            userId: data.managerId,
          },
          select: {
            userId: true,
            fullName: true,
          },
        })
      : null;

    // =================================================
    // Ghi nhận thay đổi
    // =================================================
    const changes: string[] = [];

    if (checkUser.fullName !== data.fullName) {
      changes.push(`Họ tên: "${checkUser.fullName}" → "${data.fullName}"`);
    }

    if (checkUser.userName !== data.userName) {
      changes.push(
        `Tên đăng nhập: "${checkUser.userName}" → "${data.userName}"`,
      );
    }

    if (checkUser.email !== data.email) {
      changes.push(`Email: "${checkUser.email}" → "${data.email}"`);
    }

    if (checkUser.phone !== data.phone) {
      changes.push(`SĐT: "${checkUser.phone ?? ''}" → "${data.phone ?? ''}"`);
    }

    if (checkUser.brithday?.getTime() !== data.brithday?.getTime()) {
      changes.push(
        `Ngày sinh: "${checkUser.brithday ?? ''}" → "${data.brithday ?? ''}"`,
      );
    }

    if (checkUser.address !== data.address) {
      changes.push(
        `Địa chỉ: "${checkUser.address ?? ''}" → "${data.address ?? ''}"`,
      );
    }

    if (oldVaiTro?.name !== newVaiTro?.name) {
      changes.push(
        `Vai trò: "${oldVaiTro?.name ?? ''}" → "${newVaiTro?.name ?? ''}"`,
      );
    }

    if (oldBoPhan?.name !== newBoPhan?.name) {
      changes.push(
        `Bộ phận: "${oldBoPhan?.name ?? ''}" → "${newBoPhan?.name ?? ''}"`,
      );
    }

    if (oldManager?.userId !== newManager?.userId) {
      changes.push(
        `Quản lý: "${oldManager?.fullName ?? 'Không có'}" → "${newManager?.fullName ?? 'Không có'}"`,
      );
    }

    if (checkUser.status !== data.status) {
      changes.push(`Trạng thái: "${checkUser.status}" → "${data.status}"`);
    }

    // =================================================
    // History
    // =================================================
    await this.prisma.history.create({
      data: {
        userEdit: currentUser,

        module: 'USER',

        action: 'CẬP NHẬT',

        recordId: String(data.userId),

        description:
          changes.length > 0
            ? `Cập nhật người dùng ${data.userName}: ${changes.join(', ')}`
            : `Cập nhật người dùng ${data.userName}`,

        oldData: {
          userName: checkUser.userName,
          fullName: checkUser.fullName,
          email: checkUser.email,
          phone: checkUser.phone,
          brithday: checkUser.brithday,
          address: checkUser.address,
          status: checkUser.status,

          vaiTroId: checkUser.vaiTroId,
          vaiTro: oldVaiTro?.name,

          boPhanId: checkUser.boPhanId,
          boPhan: oldBoPhan?.name,

          managerId: checkUser.managerId,
          manager: oldManager?.fullName,
        },

        newData: {
          userName: data.userName,
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          brithday: data.brithday,
          address: data.address,
          status: data.status,

          vaiTroId: data.vaiTroId,
          vaiTro: newVaiTro?.name,

          boPhanId: data.boPhanId,
          boPhan: newBoPhan?.name,

          managerId: data.managerId,
          manager: newManager?.fullName,
        },
      },
    });

    return {
      message: 'Cập nhật thành công',
      data: {
        ...data,

        vaiTro: newVaiTro,
        boPhan: newBoPhan,
        manager: newManager,
      },
    };
  }

  // ----- ĐỔI MẬT KHẨU ----- //
  async changePass(body: any, currentUser: string) {
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

    await this.prisma.history.create({
      data: {
        userEdit: currentUser,
        module: 'USER',
        action: 'ĐỔI MẬT KHẨU',
        recordId: String(data.userId),
        description: `${currentUser} thay đổi mật khẩu người dùng ${data.userName}`,
        newData: {
          userName: data.userName,
        },
      },
    });

    return { message: 'Thành công', data, date: new Date() };
  }

  // ----- TẠM NGƯNG USER ----- //
  async delUser(id: number, currentUser: string) {
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

    await this.prisma.history.create({
      data: {
        userEdit: currentUser,
        module: 'USER',
        action: 'CẬP NHẬT',
        recordId: String(data.userId),
        description: `${currentUser} tạm ngưng người dùng ${data.userName}`,
        newData: {
          userName: data.userName,
          status: data.status,
        },
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
  async editUserInfo(body: any, currentUser: string) {
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

    const changes: string[] = [];

    if (checkUser.fullName !== data.fullName) {
      changes.push(`Họ tên: "${checkUser.fullName}" → "${data.fullName}"`);
    }

    if (checkUser.email !== data.email) {
      changes.push(`Email: "${checkUser.email}" → "${data.email}"`);
    }

    if (checkUser.phone !== data.phone) {
      changes.push(`SĐT: "${checkUser.phone ?? ''}" → "${data.phone ?? ''}"`);
    }

    if (checkUser.brithday !== data.brithday) {
      changes.push(
        `Ngày sinh: "${checkUser.brithday ?? ''}" → "${data.brithday ?? ''}"`,
      );
    }
    if (checkUser.address !== data.address) {
      changes.push(
        `Địa chỉ: "${checkUser.address ?? ''}" → "${data.address ?? ''}"`,
      );
    }

    await this.prisma.history.create({
      data: {
        userEdit: currentUser,
        module: 'USER',
        action: 'USER CẬP NHẬT',
        recordId: String(data.userId),
        description:
          changes.length > 0
            ? `Cập nhật người dùng ${data.userName}: ${changes.join(', ')}`
            : `Cập nhật người dùng ${data.userName}`,

        oldData: {
          userName: checkUser.userName,
          fullName: checkUser.fullName,
          email: checkUser.email,
          phone: checkUser.phone,
          brithday: checkUser.brithday,
          address: checkUser.address,
        },

        newData: {
          userName: data.userName,
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          brithday: data.brithday,
          address: data.address,
        },
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

        // console.log('👉 SYNC:', username);

        await this.prisma.users.upsert({
          where: {
            userName: username,
          },
          update: {},
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
