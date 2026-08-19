import { MailerService } from '@nestjs-modules/mailer';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { SocketGateway } from 'src/config/gateway';

@Injectable()
export class DatHangService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly socketGateway: SocketGateway,
  ) {}
  prisma = new PrismaClient();

  // ----- LẤY TẤT CẢ ĐƠN ĐẶT HÀNG ----- //
  // async getAllDatHang(currentUser: number) {
  //   // Lấy danh sách phiếu
  //   const content = await this.prisma.phieuDatHangTong.findMany({
  //     include: {
  //       phieuDatHangDetail: true,
  //       phieuDeXuatDetail: true,
  //       phieuDatHangDuyet: {
  //         include: {
  //           users: {
  //             select: {
  //               userId: true,
  //               fullName: true,
  //             },
  //           },
  //         },
  //       },
  //       xntDetail: true,
  //     },
  //     orderBy: {
  //       id: 'desc',
  //     },
  //   });

  //   // Lấy toàn bộ user
  //   const users = await this.prisma.users.findMany({
  //     select: {
  //       userId: true,
  //       fullName: true,
  //     },
  //   });

  //   // Chỉ lấy các phiếu user hiện tại đang chờ duyệt
  //   const approveList = await this.prisma.phieuDatHangDuyet.findMany({
  //     where: {
  //       userId: currentUser,
  //       trangThai: 'CHO_DUYET',
  //     },
  //     select: {
  //       phieuId: true,
  //       capDuyet: true,
  //     },
  //   });

  //   // Map để tra cứu nhanh O(1)
  //   const approveMap = new Map(approveList.map((item) => [item.phieuId, item]));

  //   const result = content.map((item) => {
  //     const user = users.find((u) => u.userId === item.nguoiGui);

  //     const approve = approveMap.get(item.id);

  //     return {
  //       ...item,
  //       tenNguoiGui: user?.fullName ?? '',
  //       canApprove: !!approve,
  //       capDuyet: approve?.capDuyet ?? null,
  //     };
  //   });

  //   return {
  //     message: 'Thành công',
  //     content: result,
  //     date: new Date(),
  //   };
  // }
  async getAllDatHang(currentUser: number) {
    // Lấy danh sách phiếu
    const content = await this.prisma.phieuDatHangTong.findMany({
      include: {
        phieuDatHangDetail: true,
        phieuDeXuatDetail: true,
        phieuDatHangDuyet: {
          include: {
            users: {
              select: {
                userId: true,
                fullName: true,
              },
            },
          },
        },
        xntDetail: true,
      },
      orderBy: {
        id: 'desc',
      },
    });

    // Lấy toàn bộ user
    const users = await this.prisma.users.findMany({
      select: {
        userId: true,
        fullName: true,
      },
    });

    // Lấy các phiếu mà user hiện tại đang có lượt duyệt
    const approveList = await this.prisma.phieuDatHangDuyet.findMany({
      where: {
        userId: currentUser,
        trangThai: 'CHO_DUYET',
      },
      select: {
        id: true,
        phieuId: true,
        capDuyet: true,
        trangThai: true,
      },
    });

    // Map để tìm theo phieuId
    const approveMap = new Map(approveList.map((item) => [item.phieuId, item]));

    const result = content.map((item) => {
      const user = users.find((u) => u.userId === item.nguoiGui);

      const approve = approveMap.get(item.id);

      const canApprove = item.trangThai === 'CHO_DUYET' && !!approve;

      return {
        ...item,

        tenNguoiGui: user?.fullName ?? '',

        canApprove,

        capDuyet: canApprove ? approve?.capDuyet ?? null : null,
      };
    });

    return {
      message: 'Thành công',
      content: result,
      date: new Date(),
    };
  }

  // ----- CẬP NHẬP THÔNG TIN ĐƠN ĐỀ XUẤT ----- //
  async editDonDeXuat(body: any, currentUser: string) {
    const checkMaPhieu = await this.prisma.phieuDatHangTong.findFirst({
      where: {
        id: body.id,
      },
    });

    if (!checkMaPhieu) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: 'Mã phiếu này không tồn tại',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    // Lưu dữ liệu cũ trước khi update
    const oldDataMap = new Map();

    for (const item of body.phieuDatHangDetail) {
      const oldItem = await this.prisma.phieuDatHangDetail.findUnique({
        where: {
          id: Number(item.id),
        },
      });

      if (oldItem) {
        oldDataMap.set(Number(item.id), oldItem);
      }
    }
    const fieldLabels = {
      kySoLieu: 'Kỳ số liệu',
      giamGia: 'Giảm giá',
      ghiChuHangHoa: 'Ghi chú hàng hóa',
    };

    // So sánh dữ liệu cũ và mới
    const oldData: any[] = [];
    const newData: any[] = [];
    const changes: string[] = [];

    for (const item of body.phieuDatHangDetail) {
      const oldItem: any = oldDataMap.get(Number(item.id));

      if (!oldItem) continue;

      const diff: any = {};

      if ((oldItem.ghiChuHangHoa || '') !== (item.ghiChuHangHoa || '')) {
        diff.ghiChuHangHoa = {
          old: oldItem.ghiChuHangHoa || '',
          new: item.ghiChuHangHoa || '',
        };
      }

      if (Object.keys(diff).length > 0) {
        const fieldsChanged = Object.entries(diff)
          .map(([key, value]: any) => {
            const label = fieldLabels[key] || key;

            return `${label}: "${value.old}" → "${value.new}"`;
          })
          .join('\n');

        changes.push(
          `${oldItem.maHang} - ${oldItem.tenHang}: ${fieldsChanged}`,
        );

        oldData.push({
          id: oldItem.id,
          maHang: oldItem.maHang,
          ghiChuHangHoa: oldItem.ghiChuHangHoa,
        });

        newData.push({
          id: oldItem.id,
          maHang: oldItem.maHang,
          ghiChuHangHoa: item.ghiChuHangHoa,
        });
      }
    }

    // Update dữ liệu
    await Promise.all(
      body.phieuDatHangDetail.map((item: any) =>
        this.prisma.phieuDatHangDetail.update({
          where: {
            id: Number(item.id),
          },
          data: {
            ghiChuHangHoa: item.ghiChuHangHoa || '',
          },
        }),
      ),
    );

    await this.prisma.phieuDatHangTong.update({
      where: {
        id: body.id,
      },
      data: {
        modifiedDate: new Date(),
      },
    });

    // Lưu lịch sử
    await this.prisma.history.create({
      data: {
        userEdit: currentUser,
        module: 'DON-DE-XUAT',
        action: 'CẬP NHẬT',
        recordId: String(body.id),
        description:
          changes.length > 0
            ? `Phiếu ${checkMaPhieu.maPhieu}:\n${changes
                .map((item) => `- ${item}`)
                .join('\n')}`
            : `Phiếu ${checkMaPhieu.maPhieu}: Không có thay đổi dữ liệu`,
        oldData,
        newData,
      },
    });

    return {
      message: 'Cập nhật thành công',
    };
  }

  // ----- PGD CẬP NHẬP SỐ LƯỢNG ĐƠN ĐỀ XUẤT ----- //
  async editSLPGD(body: any, currentUser: number, fullName: string) {
    const checkMaPhieu = await this.prisma.phieuDatHangTong.findFirst({
      where: {
        id: body.id,
      },
    });

    if (!checkMaPhieu) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: 'Mã phiếu này không tồn tại',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const approve = await this.prisma.phieuDatHangDuyet.findFirst({
      where: {
        phieuId: body.id,
        userId: currentUser,
        trangThai: 'CHO_DUYET',
      },
    });

    if (!approve) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa phiếu này');
    }

    const field = approve.capDuyet === 1 ? 'soLuongPGDDuyet' : 'soLuongGDDuyet';

    // const fieldLabel =
    //   approve.capDuyet === 1
    //     ? 'Phó giám đốc duyệt số lượng'
    //     : 'Giám đốc duyệt số lượng';

    // Lưu dữ liệu cũ trước khi update
    const oldDataMap = new Map();

    for (const item of body.phieuDatHangDetail) {
      const oldItem = await this.prisma.phieuDatHangDetail.findUnique({
        where: {
          id: Number(item.id),
        },
      });

      if (oldItem) {
        oldDataMap.set(Number(item.id), oldItem);
      }
    }
    const fieldLabels = {
      soLuongPGDDuyet: 'Phó giám đốc duyệt số lượng',
      soLuongGDDuyet: 'Giám đốc duyệt số lượng',
    };

    // So sánh dữ liệu cũ và mới
    const oldData: any[] = [];
    const newData: any[] = [];
    const changes: string[] = [];

    for (const item of body.phieuDatHangDetail) {
      const oldItem: any = oldDataMap.get(Number(item.id));

      if (!oldItem) continue;

      const diff: any = {};

      if ((oldItem[field] || '') !== (item[field] || '')) {
        diff[field] = {
          old: oldItem[field] || '',
          new: item[field] || '',
        };
      }

      if (Object.keys(diff).length > 0) {
        const fieldsChanged = Object.entries(diff)
          .map(([key, value]: any) => {
            const label = fieldLabels[key] || key;

            return `${label}: "${value.old}" → "${value.new}"`;
          })
          .join('\n');

        changes.push(
          `${oldItem.maHang} - ${oldItem.tenHang}: ${fieldsChanged}`,
        );

        oldData.push({
          id: oldItem.id,
          maHang: oldItem.maHang,
          [field]: oldItem[field],
        });

        newData.push({
          id: oldItem.id,
          maHang: oldItem.maHang,
          [field]: item[field],
        });
      }
    }

    // Update dữ liệu
    await Promise.all(
      body.phieuDatHangDetail.map((item: any) =>
        this.prisma.phieuDatHangDetail.update({
          where: {
            id: Number(item.id),
          },
          data: {
            [field]:
              item[field] === '' || item[field] == null
                ? null
                : Number(item[field]),
          },
        }),
      ),
    );

    // Lưu lịch sử
    await this.prisma.history.create({
      data: {
        userEdit: fullName,
        module: 'DON-DE-XUAT',
        action:
          approve.capDuyet === 1
            ? changes.length > 0
              ? 'PGD TRẢ LẠI'
              : 'PGD DUYỆT SỐ LƯỢNG'
            : changes.length > 0
              ? 'GD TRẢ LẠI'
              : 'GD DUYỆT SỐ LƯỢNG',
        recordId: String(body.id),
        description:
          changes.length > 0
            ? `${approve.capDuyet === 1 ? 'PGĐ' : 'GĐ'} trả lại phiếu ${checkMaPhieu.maPhieu} do điều chỉnh số lượng:\n${changes.join('\n')}`
            : `${approve.capDuyet === 1 ? 'PGĐ' : 'GĐ'} duyệt số lượng phiếu ${checkMaPhieu.maPhieu}`,
        oldData,
        newData,
      },
    });

    return {
      message: 'Cập nhật thành công',
    };
  }

  // ----- CẬP NHẬT THÔNG TIN PHIẾU ĐỀ XUẤT ----- //
  async editDatHangTM(body: any, currentUser: string) {
    console.log(body);

    const checkMaPhieu = await this.prisma.phieuDatHangTong.findFirst({
      where: {
        id: body.phieuId,
      },
    });

    if (!checkMaPhieu) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: 'Mã phiếu không tồn tại',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const oldDataMap = new Map();

    for (const item of body.details) {
      const oldItem = await this.prisma.phieuDeXuatDetail.findUnique({
        where: {
          id: Number(item.id),
        },
      });

      if (oldItem) {
        oldDataMap.set(item.id, oldItem);
      }
    }

    const changes: string[] = [];
    const oldData: any[] = [];
    const newData: any[] = [];

    for (const item of body.details) {
      const oldItem: any = oldDataMap.get(item.id);

      if (!oldItem) continue;

      if (Number(oldItem.thuMuaNhap) !== Number(item.thuMuaNhap)) {
        changes.push(
          `${item.maHang} - ${item.tenHang}: SL thu mua đề xuất "${oldItem.thuMuaNhap}" → "${item.thuMuaNhap}"`,
        );

        oldData.push({
          id: oldItem.id,
          maHang: oldItem.maHang,
          tenHang: oldItem.tenHang,
          thuMuaNhap: oldItem.thuMuaNhap,
          canhBao: oldItem.canhBao,
        });

        newData.push({
          id: item.id,
          maHang: item.maHang,
          tenHang: item.tenHang,
          thuMuaNhap: item.thuMuaNhap,
          canhBao: item.canhBao,
        });
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. update detail đề xuất
      for (const item of body.details) {
        const existed = await tx.phieuDeXuatDetail.findUnique({
          where: {
            id: Number(item.id),
          },
        });

        if (existed) {
          // Update dòng cũ
          await tx.phieuDeXuatDetail.update({
            where: {
              id: existed.id,
            },
            data: {
              thuMuaNhap: Number(item.thuMuaNhap) || 0,
              chuThich: item.chuThich || null,
            },
          });
        } else {
          // Thêm dòng mới
          await tx.phieuDeXuatDetail.create({
            data: {
              phieuId: body.phieuId,
              tenNhaCungCap: item.tenNhaCungCap,
              chiNhanh: item.chiNhanh,
              maHang: item.maHang,
              tenHang: item.tenHang,
              giaVon: Number(item.giaVon) || 0,
              giaBan: Number(item.giaBan) || 0,
              slKhoDat: Number(item.slKhoDat) || 0,
              nhapChuyen: Number(item.nhapChuyen) || 0,
              nhapNcc: Number(item.nhapNcc) || 0,
              xuatBan: Number(item.xuatBan) || 0,
              tonCuoi: Number(item.tonCuoi) || 0,
              thuMuaNhap: Number(item.thuMuaNhap) || 0,
              ghiChuKho: item.ghiChuKho || '',
              ngayKhoDat: item.ngayKhoDat ? new Date(item.ngayKhoDat) : null,
              chuThich: item.chuThich || null,
            },
          });
        }
      }

      // 2. group lại theo mã hàng
      const grouped = body.details.reduce((acc: any, item: any) => {
        const maHang = item.maHang;

        if (!acc[maHang]) {
          acc[maHang] = 0;
        }

        acc[maHang] += Number(item.thuMuaNhap) || 0;

        return acc;
      }, {});

      // 3. update detail đặt hàng
      for (const [maHang, total] of Object.entries(grouped)) {
        const existed = await tx.phieuDatHangDetail.findFirst({
          where: {
            phieuId: body.phieuId,
            maHang,
          },
        });

        if (existed) {
          // Đã có -> cập nhật số lượng
          await tx.phieuDatHangDetail.update({
            where: {
              id: existed.id,
            },
            data: {
              soLuong: Number(total),
            },
          });
        } else {
          // Chưa có -> lấy thông tin từ detail để tạo mới
          const item = body.details.find((x: any) => x.maHang === maHang);

          if (!item) continue;
          const vat = Number(item.thueSuat) / 100;
          await tx.phieuDatHangDetail.create({
            data: {
              phieuId: body.phieuId,
              maHang: item.maHang,
              tenSp: item.tenHang,
              donGia: Number(item.giaVon) || 0,
              soLuong: Number(total),
              dvt: item.dvt || '',
              thueSuat: String(vat) || '0',
              giamGia: 0,
              ghiChuHangHoa: item.ghiChuKho || '',
              ngayKhoDat: item.ngayKhoDat ? new Date(item.ngayKhoDat) : null,
              canhBao: item.canhBao,
              slCoTheDat: item.canhBao,
              tonCuoi: item.tonCuoi || 0,
              slKhoDat: item.slKhoDat || 0,
              slTonToiUu: item.slTonToiUu || 0,
              slBanCuoi: item.slBanCuoi || 0,
              slNhapNccCuoi: item.slNhapNccCuoi || 0,
            },
          });
        }
      }
      // 4. update header
      await tx.phieuDatHangTong.update({
        where: {
          id: body.phieuId,
        },
        data: {
          modifiedDate: new Date(),
        },
      });
    });

    await this.prisma.history.create({
      data: {
        userEdit: currentUser,
        module: 'DON-DAT-HANG',
        action: 'CẬP NHẬT',
        recordId: String(body.phieuId),
        description:
          changes.length > 0
            ? `Phiếu ${checkMaPhieu.maPhieu}: \n${changes
                .map((item) => `- ${item}`)
                .join('\n')}`
            : `Phiếu ${checkMaPhieu.maPhieu}: Không có thay đổi dữ liệu`,
        oldData,
        newData,
      },
    });

    return {
      message: 'Cập nhật thành công',
    };
  }

  // ----- CẬP NHẬT THỜI GIAN GIAO HÀNG ----- //
  async updateThoiHan(
    id: number,
    thoiGianGiaoHang: string,
    currentUser: string,
  ) {
    const oldData = await this.prisma.phieuDatHangTong.findUnique({
      where: { id },
    });

    const newData = await this.prisma.phieuDatHangTong.update({
      where: { id },
      data: {
        thoiGianGiaoHang: Number(thoiGianGiaoHang),
      },
    });

    await this.prisma.history.create({
      data: {
        userEdit: currentUser,
        module: 'DON-DAT-HANG',
        action: 'CẬP NHẬT',
        recordId: String(id),
        description: `Phiếu ${oldData?.maPhieu} cập nhật thời hạn giao hàng từ ${
          oldData?.thoiGianGiaoHang ?? 0
        } ngày thành ${thoiGianGiaoHang} ngày`,
        oldData: JSON.stringify(oldData),
        newData: JSON.stringify(newData),
      },
    });

    return newData;
  }
  async getPhieuById(id: number, currentUser: number) {
    const check = await this.prisma.phieuDatHangTong.findUnique({
      where: {
        id,
      },
      include: {
        phieuDatHangDetail: true,
        phieuDeXuatDetail: true,

        phieuDatHangDuyet: {
          include: {
            users: {
              select: {
                userId: true,
                fullName: true,
              },
            },
          },
        },

        users: {
          select: {
            userId: true,
            fullName: true,
          },
        },
      },
    });

    if (!check) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: 'Số phiếu không tồn tại',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // =====================================================
    // TÌM LƯỢT DUYỆT CỦA USER HIỆN TẠI
    // =====================================================
    const approve = await this.prisma.phieuDatHangDuyet.findFirst({
      where: {
        phieuId: id,
        userId: currentUser,
      },
      orderBy: {
        capDuyet: 'desc',
      },
    });

    // =====================================================
    // KHÔNG NẰM TRONG LUỒNG DUYỆT
    // =====================================================
    if (!approve) {
      throw new ForbiddenException('Bạn không có quyền xem phiếu này');
    }

    // =====================================================
    // ĐANG CHỜ USER HIỆN TẠI DUYỆT
    // =====================================================
    if (approve.trangThai === 'CHO_DUYET' && check.trangThai === 'CHO_DUYET') {
      return {
        ...check,

        status: 'CHO_DUYET',
        canApprove: true,

        message: 'Phiếu đang chờ bạn duyệt',

        capDuyet: approve.capDuyet,

        date: new Date(),
      };
    }

    // =====================================================
    // USER ĐÃ DUYỆT
    // =====================================================
    if (approve.trangThai === 'DA_DUYET') {
      return {
        ...check,

        status: 'DA_DUYET',
        canApprove: false,

        message: 'Phiếu này đã được duyệt rồi',

        capDuyet: approve.capDuyet,

        date: new Date(),
      };
    }

    // =====================================================
    // USER ĐÃ TỪ CHỐI
    // =====================================================
    if (approve.trangThai === 'TU_CHOI') {
      return {
        ...check,

        status: 'TU_CHOI',
        canApprove: false,

        message: 'Phiếu này đã được trả lại',

        capDuyet: approve.capDuyet,

        date: new Date(),
      };
    }

    // =====================================================
    // FALLBACK
    // =====================================================
    return {
      ...check,

      status: approve.trangThai,
      canApprove: false,

      message: 'Phiếu không còn ở trạng thái chờ duyệt',

      capDuyet: approve.capDuyet,

      date: new Date(),
    };
  }

  // ----- XỬ LÝ PHÊ DUYỆT ----- //
  // async xuLyPheDuyet(
  //   body: {
  //     id: number;
  //     action: 'GUI' | 'DUYET' | 'TU_CHOI';
  //     lyDoTraLai?: string;
  //   },
  //   currentUser: number,
  //   fullName: string,
  // ) {
  //   // ===========================
  //   // Kiểm tra phiếu
  //   // ===========================
  //   const phieu = await this.prisma.phieuDatHangTong.findUnique({
  //     where: {
  //       id: body.id,
  //     },
  //   });

  //   if (!phieu) {
  //     throw new HttpException(
  //       {
  //         status: HttpStatus.BAD_REQUEST,
  //         message: 'Phiếu không tồn tại',
  //       },
  //       HttpStatus.BAD_REQUEST,
  //     );
  //   }

  //   // =====================================================
  //   // GỬI DUYỆT
  //   // =====================================================

  //   if (body.action === 'GUI') {
  //     const userGui = await this.prisma.users.findUnique({
  //       where: {
  //         userId: currentUser,
  //       },
  //       select: {
  //         boPhanId: true,
  //       },
  //     });

  //     const nguoiDuyet = await this.prisma.users.findMany({
  //       where: {
  //         boPhanId: userGui.boPhanId,
  //         vaiTroId: 7,
  //         status: true,
  //       },
  //     });

  //     if (!nguoiDuyet) {
  //       throw new BadRequestException('Không tìm thấy trưởng bộ phận');
  //     }

  //     const data = await this.prisma.$transaction(async (tx) => {
  //       const phieu = await tx.phieuDatHangTong.update({
  //         where: { id: body.id },
  //         data: {
  //           trangThai: 'CHO_DUYET',
  //           nguoiGui: currentUser,
  //           ngayGui: new Date(),
  //         },
  //       });

  //       await tx.phieuDatHangDuyet.create({
  //         data: {
  //           phieuId: body.id,
  //           userId: nguoiDuyet.userId,
  //           capDuyet: 1,
  //           trangThai: 'CHO_DUYET',
  //         },
  //       });

  //       return phieu;
  //     });

  //     await this.mailerService.sendMail({
  //       to: nguoiDuyet.email,
  //       subject: `Phiếu ${phieu.maPhieu} cần duyệt`,
  //       html: `
  //           <p>Xin chào ${nguoiDuyet.fullName},</p>

  //           <p>Có một phiếu đặt hàng cần bạn duyệt.</p>

  //           <table border="1" cellpadding="6">
  //             <tr>
  //               <td>Mã phiếu</td>
  //               <td>${data.maPhieu}</td>
  //             </tr>

  //             <tr>
  //               <td>Nhà cung cấp</td>
  //               <td>${data.tenNcc}</td>
  //             </tr>

  //             <tr>
  //               <td>Trạng thái</td>
  //               <td>${data.trangThai}</td>
  //             </tr>
  //           </table>

  //           <br/>

  //           <a href="https://services.benthanhtsc.com/phe-duyet/${data.id}">
  //             Xem phiếu
  //           </a>
  //         `,
  //     });
  //     this.socketGateway.notifyUser(nguoiDuyet.userId, {
  //       type: 'NEW_APPROVAL',
  //       phieuId: data.id,
  //       maPhieu: data.maPhieu,
  //     });

  //     await this.prisma.history.create({
  //       data: {
  //         userEdit: fullName,
  //         module: 'DON-DE-XUAT',
  //         action: 'GỬI DUYỆT',
  //         recordId: data.maPhieu,
  //         description: `${fullName} chuyển duyệt phiếu số ${data.maPhieu}`,
  //         createDate: new Date(),
  //       },
  //     });
  //     return {
  //       message: 'Đã gửi duyệt',
  //     };
  //   }

  //   // =====================================================
  //   // DUYỆT
  //   // =====================================================

  //   if (body.action === 'DUYET') {
  //     const currentApprove = await this.prisma.phieuDatHangDuyet.findFirst({
  //       where: {
  //         phieuId: body.id,
  //         userId: currentUser,
  //         trangThai: 'CHO_DUYET',
  //       },
  //     });

  //     if (!currentApprove) {
  //       throw new ForbiddenException('Bạn không có quyền duyệt phiếu này');
  //     }

  //     const FLOW: Record<number, { nextRole: number; nextCap: number }> = {
  //       1: {
  //         nextRole: 8,
  //         nextCap: 2,
  //       },
  //     };

  //     const next = FLOW[currentApprove.capDuyet];

  //     let nextUser = null;

  //     if (next) {
  //       nextUser = await this.prisma.users.findFirst({
  //         where: {
  //           vaiTroId: next.nextRole,
  //           status: true,
  //         },
  //       });
  //     }

  //     if (next && !nextUser) {
  //       throw new BadRequestException('Không tìm thấy người duyệt tiếp theo');
  //     }

  //     await this.prisma.$transaction(async (tx) => {
  //       await tx.phieuDatHangDuyet.update({
  //         where: {
  //           id: currentApprove.id,
  //         },
  //         data: {
  //           trangThai: 'DA_DUYET',
  //           ngayDuyet: new Date(),
  //         },
  //       });

  //       if (!nextUser) {
  //         await tx.phieuDatHangTong.update({
  //           where: {
  //             id: body.id,
  //           },
  //           data: {
  //             trangThai: 'DA_DUYET',
  //           },
  //         });

  //         return;
  //       }

  //       await tx.phieuDatHangDuyet.create({
  //         data: {
  //           phieuId: body.id,
  //           userId: nextUser.userId,
  //           capDuyet: next.nextCap,
  //           trangThai: 'CHO_DUYET',
  //         },
  //       });
  //     });

  //     if (nextUser) {
  //       await this.mailerService.sendMail({
  //         to: nextUser.email,
  //         subject: `Phiếu ${phieu.maPhieu} cần duyệt`,
  //         html: `
  //             <p>Xin chào ${nextUser.fullName},</p>

  //             <p>Có một phiếu đặt hàng cần bạn duyệt.</p>

  //             <table border="1" cellpadding="6">
  //               <tr>
  //                 <td>Mã phiếu</td>
  //                 <td>${phieu.maPhieu}</td>
  //               </tr>

  //               <tr>
  //                 <td>Nhà cung cấp</td>
  //                 <td>${phieu.tenNcc}</td>
  //               </tr>

  //               <tr>
  //                 <td>Trạng thái</td>
  //                 <td>${nextUser ? 'CHỜ DUYỆT' : 'ĐÃ DUYỆT'}</td>
  //               </tr>
  //             </table>

  //             <br/>

  //           <a href="https://services.benthanhtsc.com/phe-duyet/${phieu.id}">
  //               Xem phiếu
  //             </a>
  //           `,
  //       });
  //       this.socketGateway.notifyUser(nextUser.userId, {
  //         type: 'NEW_APPROVAL',
  //         phieuId: phieu.id,
  //         maPhieu: phieu.maPhieu,
  //       });
  //     } else {
  //       // Người duyệt cuối tự cập nhật giao diện
  //       this.socketGateway.notifyUser(currentUser, {
  //         type: 'APPROVED',
  //         phieuId: phieu.id,
  //         maPhieu: phieu.maPhieu,
  //       });
  //     }
  //     await this.prisma.history.create({
  //       data: {
  //         userEdit: fullName,
  //         module: 'DON-DE-XUAT',
  //         action: 'DUYỆT',
  //         recordId: phieu.maPhieu,
  //         description: nextUser
  //           ? `${fullName} đã duyệt phiếu ${phieu.maPhieu} và chuyển cho ${nextUser.fullName}`
  //           : `${fullName} đã duyệt hoàn tất phiếu ${phieu.maPhieu}`,
  //         createDate: new Date(),
  //       },
  //     });

  //     return {
  //       message: nextUser
  //         ? 'Đã chuyển duyệt cấp tiếp theo'
  //         : 'Đã duyệt hoàn tất',
  //     };
  //   }

  //   // =====================================================
  //   // TỪ CHỐI
  //   // =====================================================
  //   if (body.action === 'TU_CHOI') {
  //     const currentApprove = await this.prisma.phieuDatHangDuyet.findFirst({
  //       where: {
  //         phieuId: body.id,
  //         userId: currentUser,
  //         trangThai: 'CHO_DUYET',
  //       },
  //     });

  //     if (!currentApprove) {
  //       throw new ForbiddenException('Bạn không có quyền duyệt phiếu này');
  //     }

  //     await this.prisma.$transaction(async (tx) => {
  //       // Đánh dấu phiếu cũ
  //       await tx.phieuDatHangTong.update({
  //         where: {
  //           id: body.id,
  //         },
  //         data: {
  //           trangThai: 'TRA_LAI',
  //           lyDoTraLai: body.lyDoTraLai,
  //         },
  //       });

  //       // Hủy duyệt
  //       await tx.phieuDatHangDuyet.updateMany({
  //         where: {
  //           phieuId: body.id,
  //           trangThai: 'CHO_DUYET',
  //         },
  //         data: {
  //           trangThai: 'TU_CHOI',
  //           ngayDuyet: new Date(),
  //         },
  //       });

  //       let maGoc = phieu.maPhieu;

  //       // Nếu đã có hậu tố .01, .02... thì bỏ đi
  //       if (maGoc.includes('.')) {
  //         maGoc = maGoc.split('.')[0];
  //       }

  //       // Tìm tất cả các phiên bản của phiếu
  //       const phieuCuoi = await tx.phieuDatHangTong.findFirst({
  //         where: {
  //           maPhieu: {
  //             startsWith: maGoc,
  //           },
  //         },
  //         orderBy: {
  //           id: 'desc',
  //         },
  //       });

  //       let lan = 1;

  //       if (phieuCuoi?.maPhieu.includes('.')) {
  //         const soLan = Number(phieuCuoi.maPhieu.split('.')[1]);

  //         if (!Number.isNaN(soLan)) {
  //           lan = soLan + 1;
  //         }
  //       }

  //       const maPhieuMoi = `${maGoc}.${String(lan).padStart(2, '0')}`;

  //       // Tạo phiếu mới
  //       const newPhieu = await tx.phieuDatHangTong.create({
  //         data: {
  //           maPhieu: maPhieuMoi,
  //           tenNcc: phieu.tenNcc,
  //           congTy: phieu.congTy,
  //           diaChi: phieu.diaChi,
  //           mst: phieu.mst,
  //           ghiChuHopDong: phieu.ghiChuHopDong,
  //           fromDate: phieu.fromDate,
  //           toDate: phieu.toDate,
  //           // phieuDatHangNhap: phieu.phieuDatHangNhap,
  //           nguoiGui: phieu.nguoiGui,
  //           phieuGocId: phieu.id,
  //           trangThai: 'NHAP',
  //           createDate: phieu.createDate,
  //           modifiedDate: new Date(),
  //         },
  //       });

  //       // Copy chi tiết
  //       const phieuDatHangDetail = await tx.phieuDatHangDetail.findMany({
  //         where: {
  //           phieuId: body.id,
  //         },
  //       });

  //       await tx.phieuDatHangDetail.createMany({
  //         data: phieuDatHangDetail.map((item) => ({
  //           phieuId: newPhieu.id,
  //           maHang: item.maHang,
  //           tenSp: item.tenSp,
  //           dvt: item.dvt,
  //           donGia: item.donGia,
  //           giamGia: item.giamGia,
  //           thueSuat: item.thueSuat,
  //           soLuong: item.soLuong,
  //           soLuongPGDDuyet: null,
  //           soLuongGDDuyet: null,
  //           giaBan: item.giaBan,
  //           ghiChuHangHoa: item.ghiChuHangHoa,
  //           canhBao: item.canhBao,
  //           slCoTheDat: item.slCoTheDat,
  //           tonCuoi: item.tonCuoi,
  //           slKhoDat: item.slKhoDat,
  //           slTonToiUu: item.slTonToiUu,
  //           slBanCuoi: item.slBanCuoi,
  //           slNhapNccCuoi: item.slNhapNccCuoi,
  //           ngayKhoDat: item.ngayKhoDat,
  //         })),
  //       });

  //       // Copy chi tiết
  //       const phieuDeXuatDetail = await tx.phieuDeXuatDetail.findMany({
  //         where: {
  //           phieuId: body.id,
  //         },
  //       });

  //       await tx.phieuDeXuatDetail.createMany({
  //         data: phieuDeXuatDetail.map((item) => ({
  //           phieuId: newPhieu.id,
  //           chiNhanh: item.chiNhanh,
  //           maHang: item.maHang,
  //           tenNhaCungCap: item.tenNhaCungCap,
  //           tenHang: item.tenHang,
  //           nhapChuyen: item.nhapChuyen,
  //           nhapNcc: item.nhapNcc,
  //           xuatBan: item.xuatBan,
  //           tonCuoi: item.tonCuoi,
  //           slKhoDat: item.slKhoDat,
  //           giaVon: item.giaVon,
  //           giaBan: item.giaBan,
  //           canhBao: item.canhBao,
  //           ghiChuKho: item.ghiChuKho,
  //           thuMuaNhap: item.thuMuaNhap,
  //           ngayKhoDat: item.ngayKhoDat,
  //           chuThich: item.chuThich,
  //           phieuDatHangNhap: item.phieuDatHangNhap,
  //         })),
  //       });

  //       this.socketGateway.notifyUser(phieu.nguoiGui, {
  //         type: 'REJECT',
  //         phieuId: phieu.id,
  //         maPhieu: phieu.maPhieu,
  //         lyDoTraLai: body.lyDoTraLai,
  //       });
  //     });

  //     await this.prisma.history.create({
  //       data: {
  //         userEdit: fullName,
  //         module: 'DON-DE-XUAT',
  //         action: 'TỪ CHỐI',
  //         recordId: phieu.maPhieu,
  //         description: `${fullName} từ chối phiếu ${phieu.maPhieu}. Lý do: ${body.lyDoTraLai}`,
  //         createDate: new Date(),
  //       },
  //     });

  //     return {
  //       message: 'Đã trả lại phiếu',
  //     };
  //   }
  // }
  // async xuLyPheDuyet(
  //   body: {
  //     id: number;
  //     action: 'GUI' | 'DUYET' | 'TU_CHOI';
  //     lyDoTraLai?: string;
  //   },
  //   currentUser: number,
  //   fullName: string,
  // ) {
  //   // =====================================================
  //   // KIỂM TRA PHIẾU
  //   // =====================================================

  //   const phieu = await this.prisma.phieuDatHangTong.findUnique({
  //     where: {
  //       id: body.id,
  //     },
  //   });

  //   if (!phieu) {
  //     throw new HttpException(
  //       {
  //         status: HttpStatus.BAD_REQUEST,
  //         message: 'Phiếu không tồn tại',
  //       },
  //       HttpStatus.BAD_REQUEST,
  //     );
  //   }

  //   // =====================================================
  //   // GỬI DUYỆT
  //   // =====================================================

  //   if (body.action === 'GUI') {
  //     // ---------------------------------------------------
  //     // Lấy thông tin người gửi
  //     // ---------------------------------------------------

  //     const userGui = await this.prisma.users.findUnique({
  //       where: {
  //         userId: currentUser,
  //       },
  //       select: {
  //         userId: true,
  //         boPhanId: true,
  //         fullName: true,
  //       },
  //     });

  //     if (!userGui) {
  //       throw new BadRequestException('Không tìm thấy người gửi');
  //     }

  //     // ---------------------------------------------------
  //     // Lấy TẤT CẢ người duyệt cấp 1
  //     // ---------------------------------------------------

  //     const nguoiDuyet = await this.prisma.users.findMany({
  //       where: {
  //         boPhanId: userGui.boPhanId,
  //         vaiTroId: 7,
  //         status: true,
  //       },
  //       select: {
  //         userId: true,
  //         fullName: true,
  //         email: true,
  //       },
  //     });

  //     if (nguoiDuyet.length === 0) {
  //       throw new BadRequestException('Không tìm thấy người duyệt cấp 1');
  //     }

  //     // ===================================================
  //     // TRANSACTION
  //     // ===================================================

  //     const data = await this.prisma.$transaction(async (tx) => {
  //       // -------------------------------------------------
  //       // Cập nhật phiếu
  //       // -------------------------------------------------

  //       const phieuUpdate = await tx.phieuDatHangTong.update({
  //         where: {
  //           id: body.id,
  //         },
  //         data: {
  //           trangThai: 'CHO_DUYET',
  //           nguoiGui: currentUser,
  //           ngayGui: new Date(),
  //         },
  //       });

  //       // -------------------------------------------------
  //       // Tạo lượt duyệt cho TẤT CẢ người cấp 1
  //       // -------------------------------------------------

  //       await tx.phieuDatHangDuyet.createMany({
  //         data: nguoiDuyet.map((user) => ({
  //           phieuId: body.id,
  //           userId: user.userId,
  //           capDuyet: 1,
  //           trangThai: 'CHO_DUYET',
  //         })),
  //       });

  //       return phieuUpdate;
  //     });

  //     // ===================================================
  //     // GỬI MAIL CHO TẤT CẢ NGƯỜI CẤP 1
  //     // ===================================================

  //     for (const user of nguoiDuyet) {
  //       await this.mailerService.sendMail({
  //         to: user.email,
  //         subject: `Phiếu ${data.maPhieu} cần duyệt`,
  //         html: `
  //         <p>Xin chào ${user.fullName},</p>

  //         <p>Có một phiếu đặt hàng cần bạn duyệt.</p>

  //         <table border="1" cellpadding="6">
  //           <tr>
  //             <td>Mã phiếu</td>
  //             <td>${data.maPhieu}</td>
  //           </tr>

  //           <tr>
  //             <td>Nhà cung cấp</td>
  //             <td>${data.tenNcc}</td>
  //           </tr>

  //           <tr>
  //             <td>Trạng thái</td>
  //             <td>CHỜ DUYỆT</td>
  //           </tr>
  //         </table>

  //         <br/>

  //         <a href="https://services.benthanhtsc.com/phe-duyet/${data.id}">
  //           Xem phiếu
  //         </a>
  //       `,
  //       });

  //       // -------------------------------------------------
  //       // Socket
  //       // -------------------------------------------------

  //       this.socketGateway.notifyUser(user.userId, {
  //         type: 'NEW_APPROVAL',
  //         phieuId: data.id,
  //         maPhieu: data.maPhieu,
  //       });
  //     }

  //     // ===================================================
  //     // HISTORY
  //     // ===================================================

  //     await this.prisma.history.create({
  //       data: {
  //         userEdit: fullName,
  //         module: 'DON-DE-XUAT',
  //         action: 'GỬI DUYỆT',
  //         recordId: data.maPhieu,
  //         description: `${fullName} chuyển duyệt phiếu số ${data.maPhieu}`,
  //         createDate: new Date(),
  //       },
  //     });

  //     return {
  //       status: 'SUCCESS',
  //       message: 'Đã gửi duyệt',
  //     };
  //   }

  //   // =====================================================
  //   // DUYỆT
  //   // =====================================================

  //   if (body.action === 'DUYET') {
  //     // ---------------------------------------------------
  //     // Tìm lượt duyệt của user hiện tại
  //     // ---------------------------------------------------

  //     const currentApprove = await this.prisma.phieuDatHangDuyet.findFirst({
  //       where: {
  //         phieuId: body.id,
  //         userId: currentUser,
  //       },
  //       orderBy: {
  //         capDuyet: 'desc',
  //       },
  //     });

  //     // ---------------------------------------------------
  //     // Không có quyền
  //     // ---------------------------------------------------

  //     if (!currentApprove) {
  //       throw new ForbiddenException('Bạn không có quyền duyệt phiếu này');
  //     }

  //     // ---------------------------------------------------
  //     // User này đã duyệt
  //     // ---------------------------------------------------

  //     if (currentApprove.trangThai === 'DA_DUYET') {
  //       return {
  //         status: 'DA_DUYET',
  //         canApprove: false,
  //         message: 'Bạn đã duyệt phiếu này',
  //       };
  //     }

  //     // ---------------------------------------------------
  //     // User này bị mất quyền do người cùng cấp duyệt trước
  //     // ---------------------------------------------------

  //     if (currentApprove.trangThai === 'MAT_LUOC') {
  //       return {
  //         status: 'DA_DUYET',
  //         canApprove: false,
  //         message: 'Phiếu này đã được người khác duyệt',
  //       };
  //     }

  //     // ---------------------------------------------------
  //     // Không phải CHO_DUYET
  //     // ---------------------------------------------------

  //     if (currentApprove.trangThai !== 'CHO_DUYET') {
  //       throw new ForbiddenException('Bạn không có quyền duyệt phiếu này');
  //     }

  //     // ===================================================
  //     // FLOW
  //     // ===================================================

  //     const FLOW: Record<
  //       number,
  //       {
  //         nextRole: number;
  //         nextCap: number;
  //       }
  //     > = {
  //       1: {
  //         nextRole: 8,
  //         nextCap: 2,
  //       },
  //     };

  //     const next = FLOW[currentApprove.capDuyet];

  //     let nextUsers: {
  //       userId: number;
  //       fullName: string;
  //       email: string;
  //     }[] = [];

  //     // ===================================================
  //     // LẤY TẤT CẢ NGƯỜI DUYỆT CẤP TIẾP THEO
  //     // ===================================================

  //     if (next) {
  //       nextUsers = await this.prisma.users.findMany({
  //         where: {
  //           vaiTroId: next.nextRole,
  //           status: true,
  //         },
  //         select: {
  //           userId: true,
  //           fullName: true,
  //           email: true,
  //         },
  //       });

  //       if (nextUsers.length === 0) {
  //         throw new BadRequestException(
  //           'Không tìm thấy người duyệt cấp tiếp theo',
  //         );
  //       }
  //     }

  //     // ===================================================
  //     // TRANSACTION
  //     // ===================================================

  //     let daDuyet = false;

  //     await this.prisma.$transaction(async (tx) => {
  //       // =================================================
  //       // QUAN TRỌNG
  //       //
  //       // Chỉ người nào update được record CHO_DUYET
  //       // mới được xem là người bấm trước.
  //       // =================================================

  //       const result = await tx.phieuDatHangDuyet.updateMany({
  //         where: {
  //           id: currentApprove.id,
  //           phieuId: body.id,
  //           userId: currentUser,
  //           capDuyet: currentApprove.capDuyet,
  //           trangThai: 'CHO_DUYET',
  //         },
  //         data: {
  //           trangThai: 'DA_DUYET',
  //           ngayDuyet: new Date(),
  //         },
  //       });

  //       // =================================================
  //       // Người khác đã duyệt trước
  //       // =================================================

  //       if (result.count === 0) {
  //         throw new ForbiddenException(
  //           'Phiếu này đã được người khác duyệt trước',
  //         );
  //       }

  //       daDuyet = true;

  //       // =================================================
  //       // Những người CÙNG CẤP còn lại
  //       // => mất quyền duyệt
  //       // =================================================

  //       await tx.phieuDatHangDuyet.updateMany({
  //         where: {
  //           phieuId: body.id,
  //           capDuyet: currentApprove.capDuyet,
  //           trangThai: 'CHO_DUYET',
  //           userId: {
  //             not: currentUser,
  //           },
  //         },
  //         data: {
  //           trangThai: 'MAT_LUOC',
  //           ngayDuyet: new Date(),
  //         },
  //       });

  //       // =================================================
  //       // CẤP TIẾP THEO
  //       // =================================================

  //       if (next && nextUsers.length > 0) {
  //         // ------------------------------------------------
  //         // Kiểm tra cấp tiếp theo đã tồn tại chưa
  //         // ------------------------------------------------

  //         const existingNext = await tx.phieuDatHangDuyet.findFirst({
  //           where: {
  //             phieuId: body.id,
  //             capDuyet: next.nextCap,
  //           },
  //         });

  //         // ------------------------------------------------
  //         // Chỉ tạo nếu chưa tồn tại
  //         // ------------------------------------------------

  //         if (!existingNext) {
  //           await tx.phieuDatHangDuyet.createMany({
  //             data: nextUsers.map((user) => ({
  //               phieuId: body.id,
  //               userId: user.userId,
  //               capDuyet: next.nextCap,
  //               trangThai: 'CHO_DUYET',
  //             })),
  //           });
  //         }

  //         return;
  //       }

  //       // =================================================
  //       // Không còn cấp tiếp theo
  //       // => HOÀN TẤT
  //       // =================================================

  //       await tx.phieuDatHangTong.update({
  //         where: {
  //           id: body.id,
  //         },
  //         data: {
  //           trangThai: 'DA_DUYET',
  //         },
  //       });
  //     });

  //     // ===================================================
  //     // Không thành công
  //     // ===================================================

  //     if (!daDuyet) {
  //       throw new ForbiddenException(
  //         'Phiếu này đã được người khác duyệt trước',
  //       );
  //     }

  //     // ===================================================
  //     // GỬI MAIL CẤP TIẾP THEO
  //     // ===================================================

  //     if (nextUsers.length > 0) {
  //       for (const nextUser of nextUsers) {
  //         await this.mailerService.sendMail({
  //           to: nextUser.email,
  //           subject: `Phiếu ${phieu.maPhieu} cần duyệt`,
  //           html: `
  //           <p>Xin chào ${nextUser.fullName},</p>

  //           <p>Có một phiếu đặt hàng cần bạn duyệt.</p>

  //           <table border="1" cellpadding="6">
  //             <tr>
  //               <td>Mã phiếu</td>
  //               <td>${phieu.maPhieu}</td>
  //             </tr>

  //             <tr>
  //               <td>Nhà cung cấp</td>
  //               <td>${phieu.tenNcc}</td>
  //             </tr>

  //             <tr>
  //               <td>Trạng thái</td>
  //               <td>CHỜ DUYỆT</td>
  //             </tr>
  //           </table>

  //           <br/>

  //           <a href="https://services.benthanhtsc.com/phe-duyet/${phieu.id}">
  //             Xem phiếu
  //           </a>
  //         `,
  //         });

  //         this.socketGateway.notifyUser(nextUser.userId, {
  //           type: 'NEW_APPROVAL',
  //           phieuId: phieu.id,
  //           maPhieu: phieu.maPhieu,
  //         });
  //       }
  //     } else {
  //       // -------------------------------------------------
  //       // Duyệt hoàn tất
  //       // -------------------------------------------------

  //       this.socketGateway.notifyUser(currentUser, {
  //         type: 'APPROVED',
  //         phieuId: phieu.id,
  //         maPhieu: phieu.maPhieu,
  //       });
  //     }

  //     // ===================================================
  //     // HISTORY
  //     // ===================================================

  //     await this.prisma.history.create({
  //       data: {
  //         userEdit: fullName,
  //         module: 'DON-DE-XUAT',
  //         action: 'DUYỆT',
  //         recordId: phieu.maPhieu,
  //         description:
  //           nextUsers.length > 0
  //             ? `${fullName} đã duyệt phiếu ${phieu.maPhieu} và chuyển sang cấp ${next.nextCap}`
  //             : `${fullName} đã duyệt hoàn tất phiếu ${phieu.maPhieu}`,
  //         createDate: new Date(),
  //       },
  //     });

  //     return {
  //       status: 'SUCCESS',
  //       message:
  //         nextUsers.length > 0
  //           ? 'Đã duyệt và chuyển sang cấp tiếp theo'
  //           : 'Đã duyệt hoàn tất',
  //     };
  //   }

  //   // =====================================================
  //   // TỪ CHỐI
  //   // =====================================================

  //   if (body.action === 'TU_CHOI') {
  //     // ---------------------------------------------------
  //     // Tìm lượt duyệt của user
  //     // ---------------------------------------------------

  //     const currentApprove = await this.prisma.phieuDatHangDuyet.findFirst({
  //       where: {
  //         phieuId: body.id,
  //         userId: currentUser,
  //       },
  //       orderBy: {
  //         capDuyet: 'desc',
  //       },
  //     });

  //     // ---------------------------------------------------
  //     // Không có quyền
  //     // ---------------------------------------------------

  //     if (!currentApprove) {
  //       throw new ForbiddenException('Bạn không có quyền duyệt phiếu này');
  //     }

  //     // ---------------------------------------------------
  //     // Đã duyệt
  //     // ---------------------------------------------------

  //     if (currentApprove.trangThai === 'DA_DUYET') {
  //       return {
  //         status: 'DA_DUYET',
  //         canApprove: false,
  //         message: `Phiếu này đã được duyệt`,
  //       };
  //     }

  //     // ---------------------------------------------------
  //     // Đã từ chối / người khác đã duyệt
  //     // ---------------------------------------------------

  //     if (currentApprove.trangThai === 'TU_CHOI') {
  //       return {
  //         status: 'TU_CHOI',
  //         canApprove: false,
  //         message: 'Phiếu này đã được xử lý',
  //       };
  //     }

  //     // ---------------------------------------------------
  //     // Không còn chờ duyệt
  //     // ---------------------------------------------------

  //     if (currentApprove.trangThai !== 'CHO_DUYET') {
  //       throw new ForbiddenException('Bạn không có quyền duyệt phiếu này');
  //     }

  //     // ===================================================
  //     // TRANSACTION TỪ CHỐI
  //     // ===================================================

  //     let newPhieu: any;

  //     await this.prisma.$transaction(async (tx) => {
  //       // =================================================
  //       // Quan trọng:
  //       // chỉ user còn CHO_DUYET mới được từ chối
  //       // =================================================

  //       const result = await tx.phieuDatHangDuyet.updateMany({
  //         where: {
  //           id: currentApprove.id,
  //           phieuId: body.id,
  //           userId: currentUser,
  //           trangThai: 'CHO_DUYET',
  //         },
  //         data: {
  //           trangThai: 'TU_CHOI',
  //           ngayDuyet: new Date(),
  //         },
  //       });

  //       if (result.count === 0) {
  //         throw new ForbiddenException(
  //           'Phiếu này đã được người khác xử lý trước',
  //         );
  //       }

  //       // =================================================
  //       // Cập nhật phiếu
  //       // =================================================

  //       await tx.phieuDatHangTong.update({
  //         where: {
  //           id: body.id,
  //         },
  //         data: {
  //           trangThai: 'TRA_LAI',
  //           lyDoTraLai: body.lyDoTraLai,
  //         },
  //       });

  //       // =================================================
  //       // Các user cùng cấp còn lại
  //       // => mất quyền xử lý
  //       // =================================================

  //       await tx.phieuDatHangDuyet.updateMany({
  //         where: {
  //           phieuId: body.id,
  //           capDuyet: currentApprove.capDuyet,
  //           trangThai: 'CHO_DUYET',
  //           userId: {
  //             not: currentUser,
  //           },
  //         },
  //         data: {
  //           trangThai: 'MAT_LUOC',
  //           ngayDuyet: new Date(),
  //         },
  //       });

  //       // =================================================
  //       // Tìm mã gốc
  //       // =================================================

  //       let maGoc = phieu.maPhieu;

  //       if (maGoc.includes('.')) {
  //         maGoc = maGoc.split('.')[0];
  //       }

  //       // =================================================
  //       // Tìm phiên bản cuối
  //       // =================================================

  //       const phieuCuoi = await tx.phieuDatHangTong.findFirst({
  //         where: {
  //           maPhieu: {
  //             startsWith: maGoc,
  //           },
  //         },
  //         orderBy: {
  //           id: 'desc',
  //         },
  //       });

  //       let lan = 1;

  //       if (phieuCuoi?.maPhieu.includes('.')) {
  //         const parts = phieuCuoi.maPhieu.split('.');
  //         const soLan = Number(parts[1]);

  //         if (!Number.isNaN(soLan)) {
  //           lan = soLan + 1;
  //         }
  //       }

  //       const maPhieuMoi = `${maGoc}.${String(lan).padStart(2, '0')}`;

  //       // =================================================
  //       // Tạo phiếu mới
  //       // =================================================

  //       newPhieu = await tx.phieuDatHangTong.create({
  //         data: {
  //           maPhieu: maPhieuMoi,
  //           tenNcc: phieu.tenNcc,
  //           congTy: phieu.congTy,
  //           diaChi: phieu.diaChi,
  //           mst: phieu.mst,
  //           ghiChuHopDong: phieu.ghiChuHopDong,
  //           fromDate: phieu.fromDate,
  //           toDate: phieu.toDate,
  //           nguoiGui: phieu.nguoiGui,
  //           phieuGocId: phieu.id,
  //           trangThai: 'NHAP',
  //           createDate: phieu.createDate,
  //           modifiedDate: new Date(),
  //         },
  //       });

  //       // =================================================
  //       // Copy phieuDatHangDetail
  //       // =================================================

  //       // const phieuDatHangDetail = await tx.phieuDatHangDetail.findMany({
  //       //   where: {
  //       //     phieuId: body.id,
  //       //   },
  //       // });

  //       // if (phieuDatHangDetail.length > 0) {
  //       //   await tx.phieuDatHangDetail.createMany({
  //       //     data: phieuDatHangDetail.map((item) => ({
  //       //       phieuId: newPhieu.id,
  //       //       maHang: item.maHang,
  //       //       tenSp: item.tenSp,
  //       //       dvt: item.dvt,
  //       //       donGia: item.donGia,
  //       //       giamGia: item.giamGia,
  //       //       thueSuat: item.thueSuat,
  //       //       soLuong: item.soLuong,
  //       //       soLuongPGDDuyet: null,
  //       //       soLuongGDDuyet: null,
  //       //       giaBan: item.giaBan,
  //       //       ghiChuHangHoa: item.ghiChuHangHoa,
  //       //       canhBao: item.canhBao,
  //       //       slCoTheDat: item.slCoTheDat,
  //       //       tonCuoi: item.tonCuoi,
  //       //       slKhoDat: item.slKhoDat,
  //       //       slTonToiUu: item.slTonToiUu,
  //       //       slBanCuoi: item.slBanCuoi,
  //       //       slNhapNccCuoi: item.slNhapNccCuoi,
  //       //       ngayKhoDat: item.ngayKhoDat,
  //       //     })),
  //       //   });
  //       // }

  //       // // =================================================
  //       // // Copy phieuDeXuatDetail
  //       // // =================================================

  //       // const phieuDeXuatDetail = await tx.phieuDeXuatDetail.findMany({
  //       //   where: {
  //       //     phieuId: body.id,
  //       //   },
  //       // });

  //       // if (phieuDeXuatDetail.length > 0) {
  //       //   await tx.phieuDeXuatDetail.createMany({
  //       //     data: phieuDeXuatDetail.map((item) => ({
  //       //       phieuId: newPhieu.id,
  //       //       chiNhanh: item.chiNhanh,
  //       //       maHang: item.maHang,
  //       //       tenNhaCungCap: item.tenNhaCungCap,
  //       //       tenHang: item.tenHang,
  //       //       nhapChuyen: item.nhapChuyen,
  //       //       nhapNcc: item.nhapNcc,
  //       //       xuatBan: item.xuatBan,
  //       //       tonCuoi: item.tonCuoi,
  //       //       slKhoDat: item.slKhoDat,
  //       //       giaVon: item.giaVon,
  //       //       giaBan: item.giaBan,
  //       //       canhBao: item.canhBao,
  //       //       ghiChuKho: item.ghiChuKho,
  //       //       thuMuaNhap: item.thuMuaNhap,
  //       //       ngayKhoDat: item.ngayKhoDat,
  //       //       chuThich: item.chuThich,
  //       //       phieuDatHangNhap: item.phieuDatHangNhap,
  //       //     })),
  //       //   });
  //       // }

  //       // const xntDetail = await tx.xntDetail.findMany({
  //       //   where: {
  //       //     phieuId: body.id,
  //       //   },
  //       // });

  //       // if (xntDetail.length > 0) {
  //       //   await tx.xntDetail.createMany({
  //       //     data: xntDetail.map((item) => ({
  //       //       phieuId: newPhieu.id,
  //       //       chiNhanh: item.chiNhanh,
  //       //       maHang: item.maHang,
  //       //       tenNhaCungCap: item.tenNhaCungCap,

  //       //       nhapChuyen: item.nhapChuyen,
  //       //       slTonToiUu: item.slTonToiUu,
  //       //       xuatBan: item.xuatBan,
  //       //       tonCuoi: item.tonCuoi,

  //       //       canhBao: item.canhBao,
  //       //     })),
  //       //   });
  //       // }
  //       // =================================================
  //       // Chuyển phieuDatHangDetail sang phiếu mới
  //       // =================================================

  //       await tx.phieuDatHangDetail.updateMany({
  //         where: {
  //           phieuId: body.id,
  //         },
  //         data: {
  //           phieuId: newPhieu.id,

  //           // reset số lượng duyệt nếu cần
  //           soLuongPGDDuyet: null,
  //           soLuongGDDuyet: null,
  //         },
  //       });

  //       // =================================================
  //       // Chuyển phieuDeXuatDetail sang phiếu mới
  //       // =================================================

  //       await tx.phieuDeXuatDetail.updateMany({
  //         where: {
  //           phieuId: body.id,
  //         },
  //         data: {
  //           phieuId: newPhieu.id,
  //         },
  //       });

  //       // =================================================
  //       // Chuyển xntDetail sang phiếu mới
  //       // =================================================

  //       await tx.xntDetail.updateMany({
  //         where: {
  //           phieuId: body.id,
  //         },
  //         data: {
  //           phieuId: newPhieu.id,
  //         },
  //       });
  //       // =================================================
  //       // Thông báo người gửi
  //       // =================================================

  //       if (phieu.nguoiGui) {
  //         this.socketGateway.notifyUser(phieu.nguoiGui, {
  //           type: 'REJECT',
  //           phieuId: phieu.id,
  //           maPhieu: phieu.maPhieu,
  //           newPhieuId: newPhieu.id,
  //           newMaPhieu: newPhieu.maPhieu,
  //           lyDoTraLai: body.lyDoTraLai,
  //         });
  //       }
  //     });

  //     // ===================================================
  //     // HISTORY
  //     // ===================================================

  //     await this.prisma.history.create({
  //       data: {
  //         userEdit: fullName,
  //         module: 'DON-DE-XUAT',
  //         action: 'TỪ CHỐI',
  //         recordId: phieu.maPhieu,
  //         description:
  //           `${fullName} từ chối phiếu ${phieu.maPhieu}. ` +
  //           `Lý do: ${body.lyDoTraLai}`,
  //         createDate: new Date(),
  //       },
  //     });

  //     return {
  //       status: 'TU_CHOI',
  //       message: 'Đã trả lại phiếu',
  //       newPhieuId: newPhieu?.id,
  //       newMaPhieu: newPhieu?.maPhieu,
  //     };
  //   }

  //   // =====================================================
  //   // ACTION KHÔNG HỢP LỆ
  //   // =====================================================

  //   throw new BadRequestException('Thao tác phê duyệt không hợp lệ');
  // }
  async xuLyPheDuyet(
    body: {
      id: number;
      action: 'GUI' | 'DUYET' | 'TU_CHOI';
      lyDoTraLai?: string;
    },
    currentUser: number,
    fullName: string,
  ) {
    // =====================================================
    // KIỂM TRA PHIẾU
    // =====================================================
    const phieu = await this.prisma.phieuDatHangTong.findUnique({
      where: {
        id: body.id,
      },
    });

    if (!phieu) {
      throw new BadRequestException('Phiếu không tồn tại');
    }

    // =====================================================
    // 1. GỬI DUYỆT
    // =====================================================
    if (body.action === 'GUI') {
      // Chỉ phiếu NHAP hoặc TRA_LAI mới được gửi
      if (!['NHAP', 'TRA_LAI'].includes(phieu.trangThai)) {
        throw new BadRequestException('Phiếu này không thể gửi duyệt');
      }

      // ===================================================
      // Kiểm tra người gửi
      // ===================================================
      const userGui = await this.prisma.users.findUnique({
        where: {
          userId: currentUser,
        },
        select: {
          userId: true,
          boPhanId: true,
          fullName: true,
        },
      });

      if (!userGui) {
        throw new BadRequestException('Không tìm thấy người gửi');
      }

      // ===================================================
      // TÌM NGƯỜI DUYỆT CẤP 1
      //
      // Hiện tại ví dụ:
      // vaiTroId = 7
      //
      // Sau này nếu dùng managerId thì thay logic này.
      // ===================================================
      const nguoiDuyet = await this.prisma.users.findFirst({
        where: {
          vaiTroId: 7,
          status: true,
        },
        select: {
          userId: true,
          fullName: true,
          email: true,
        },
      });

      if (!nguoiDuyet) {
        throw new BadRequestException('Không tìm thấy người duyệt cấp 1');
      }

      // ===================================================
      // CẬP NHẬT PHIẾU + TẠO LƯỢT DUYỆT
      // ===================================================
      const data = await this.prisma.$transaction(async (tx) => {
        // tránh gửi duyệt 2 lần
        const existingApprove = await tx.phieuDatHangDuyet.findFirst({
          where: {
            phieuId: body.id,
            trangThai: 'CHO_DUYET',
          },
        });

        if (existingApprove) {
          throw new BadRequestException('Phiếu đang trong quá trình duyệt');
        }

        const updatedPhieu = await tx.phieuDatHangTong.update({
          where: {
            id: body.id,
          },
          data: {
            trangThai: 'CHO_DUYET',
            nguoiGui: currentUser,
            ngayGui: new Date(),
            lyDoTraLai: null,
          },
        });

        await tx.phieuDatHangDuyet.create({
          data: {
            phieuId: body.id,
            userId: nguoiDuyet.userId,
            capDuyet: 1,
            trangThai: 'CHO_DUYET',
          },
        });

        return updatedPhieu;
      });

      // ===================================================
      // EMAIL
      // ===================================================
      if (nguoiDuyet.email) {
        await this.mailerService.sendMail({
          to: nguoiDuyet.email,
          subject: `Phiếu ${data.maPhieu} cần duyệt`,
          html: `
          <p>Xin chào ${nguoiDuyet.fullName},</p>

          <p>Có một phiếu đặt hàng cần bạn duyệt.</p>

          <table
            border="1"
            cellpadding="6"
            cellspacing="0"
          >
            <tr>
              <td><b>Mã phiếu</b></td>
              <td>${data.maPhieu}</td>
            </tr>

            <tr>
              <td><b>Nhà cung cấp</b></td>
              <td>${data.tenNcc}</td>
            </tr>

            <tr>
              <td><b>Người gửi</b></td>
              <td>${fullName}</td>
            </tr>
          </table>

          <br />

          <a
            href="https://services.benthanhtsc.com/phe-duyet/${data.id}"
          >
            Xem phiếu
          </a>
        `,
        });
      }

      // ===================================================
      // SOCKET
      // ===================================================
      this.socketGateway.notifyUser(nguoiDuyet.userId, {
        type: 'NEW_APPROVAL',
        phieuId: data.id,
        maPhieu: data.maPhieu,
      });

      // ===================================================
      // HISTORY
      // ===================================================
      await this.prisma.history.create({
        data: {
          userEdit: fullName,
          module: 'DON-DE-XUAT',
          action: 'GỬI DUYỆT',
          recordId: data.maPhieu,
          description:
            `${fullName} chuyển duyệt phiếu ${data.maPhieu} ` +
            `cho ${nguoiDuyet.fullName}`,
          createDate: new Date(),
        },
      });

      return {
        message: 'Đã gửi duyệt',
      };
    }

    // =====================================================
    // 2. DUYỆT
    // =====================================================
    if (body.action === 'DUYET') {
      // ===================================================
      // Kiểm tra đúng lượt của user hiện tại
      // ===================================================
      const currentApprove = await this.prisma.phieuDatHangDuyet.findFirst({
        where: {
          phieuId: body.id,
          userId: currentUser,
          trangThai: 'CHO_DUYET',
        },
      });

      if (!currentApprove) {
        throw new ForbiddenException(
          'Bạn không có quyền duyệt phiếu này hoặc phiếu đã được xử lý',
        );
      }

      // ===================================================
      // FLOW DUYỆT
      //
      // cap 1 -> role 8 -> cap 2
      // cap 2 -> hoàn tất
      //
      // Ví dụ:
      // cấp 1 = PGĐ
      // cấp 2 = GĐ
      // ===================================================
      const FLOW: Record<
        number,
        {
          nextRole: number;
          nextCap: number;
        }
      > = {
        1: {
          nextRole: 8,
          nextCap: 2,
        },
      };

      const next = FLOW[currentApprove.capDuyet];

      let nextUser: {
        userId: number;
        fullName: string | null;
        email: string | null;
      } | null = null;

      // ===================================================
      // Tìm người duyệt tiếp theo nếu còn cấp
      // ===================================================
      if (next) {
        nextUser = await this.prisma.users.findFirst({
          where: {
            vaiTroId: next.nextRole,
            status: true,
          },
          select: {
            userId: true,
            fullName: true,
            email: true,
          },
        });

        if (!nextUser) {
          throw new BadRequestException('Không tìm thấy người duyệt tiếp theo');
        }
      }

      // ===================================================
      // TRANSACTION DUYỆT
      // ===================================================
      await this.prisma.$transaction(async (tx) => {
        // khóa lượt hiện tại
        const updateResult = await tx.phieuDatHangDuyet.updateMany({
          where: {
            id: currentApprove.id,
            phieuId: body.id,
            userId: currentUser,
            trangThai: 'CHO_DUYET',
          },
          data: {
            trangThai: 'DA_DUYET',
            ngayDuyet: new Date(),
          },
        });

        if (updateResult.count === 0) {
          throw new ForbiddenException('Phiếu này đã được xử lý trước');
        }

        // =================================================
        // HẾT CẤP DUYỆT
        // =================================================
        if (!nextUser) {
          await tx.phieuDatHangTong.update({
            where: {
              id: body.id,
            },
            data: {
              trangThai: 'DA_DUYET',
            },
          });

          return;
        }

        // =================================================
        // TẠO LƯỢT DUYỆT CẤP TIẾP THEO
        // =================================================
        await tx.phieuDatHangDuyet.create({
          data: {
            phieuId: body.id,
            userId: nextUser.userId,
            capDuyet: next!.nextCap,
            trangThai: 'CHO_DUYET',
          },
        });
      });

      // ===================================================
      // EMAIL CẤP TIẾP THEO
      // ===================================================
      if (nextUser) {
        if (nextUser.email) {
          await this.mailerService.sendMail({
            to: nextUser.email,

            subject: `Phiếu ${phieu.maPhieu} cần duyệt`,

            html: `
            <p>Xin chào ${nextUser.fullName},</p>

            <p>
              Phiếu đặt hàng
              <b>${phieu.maPhieu}</b>
              đang chờ bạn duyệt.
            </p>

            <table
              border="1"
              cellpadding="6"
              cellspacing="0"
            >
              <tr>
                <td><b>Mã phiếu</b></td>
                <td>${phieu.maPhieu}</td>
              </tr>

              <tr>
                <td><b>Nhà cung cấp</b></td>
                <td>${phieu.tenNcc}</td>
              </tr>

              <tr>
                <td><b>Người vừa duyệt</b></td>
                <td>${fullName}</td>
              </tr>
            </table>

            <br />

            <a
              href="https://services.benthanhtsc.com/phe-duyet/${phieu.id}"
            >
              Xem phiếu
            </a>
          `,
          });
        }

        this.socketGateway.notifyUser(nextUser.userId, {
          type: 'NEW_APPROVAL',
          phieuId: phieu.id,
          maPhieu: phieu.maPhieu,
        });
      } else {
        // người cuối vừa duyệt xong
        this.socketGateway.notifyUser(currentUser, {
          type: 'APPROVED',
          phieuId: phieu.id,
          maPhieu: phieu.maPhieu,
        });
      }

      // ===================================================
      // HISTORY
      // ===================================================
      await this.prisma.history.create({
        data: {
          userEdit: fullName,
          module: 'DON-DE-XUAT',
          action: 'DUYỆT',
          recordId: phieu.maPhieu,

          description: nextUser
            ? `${fullName} đã duyệt phiếu ${phieu.maPhieu} và chuyển cho ${nextUser.fullName}`
            : `${fullName} đã duyệt hoàn tất phiếu ${phieu.maPhieu}`,

          createDate: new Date(),
        },
      });

      return {
        message: nextUser
          ? 'Đã duyệt và chuyển cấp tiếp theo'
          : 'Đã duyệt hoàn tất',
      };
    }

    // =====================================================
    // 3. TỪ CHỐI / TRẢ LẠI
    // =====================================================
    if (body.action === 'TU_CHOI') {
      if (!body.lyDoTraLai?.trim()) {
        throw new BadRequestException('Vui lòng nhập lý do trả lại');
      }

      // =====================================================
      // KIỂM TRA ĐÚNG NGƯỜI ĐANG CÓ QUYỀN TỪ CHỐI
      // =====================================================
      const currentApprove = await this.prisma.phieuDatHangDuyet.findFirst({
        where: {
          phieuId: body.id,
          userId: currentUser,
          trangThai: 'CHO_DUYET',
        },
      });

      if (!currentApprove) {
        throw new ForbiddenException(
          'Bạn không có quyền trả lại phiếu này hoặc phiếu đã được xử lý',
        );
      }

      const newPhieu = await this.prisma.$transaction(async (tx) => {
        // =====================================================
        // 1. KHÓA LƯỢT DUYỆT HIỆN TẠI
        // =====================================================
        const result = await tx.phieuDatHangDuyet.updateMany({
          where: {
            id: currentApprove.id,
            phieuId: body.id,
            userId: currentUser,
            trangThai: 'CHO_DUYET',
          },
          data: {
            trangThai: 'TU_CHOI',
            ngayDuyet: new Date(),
            ghiChu: body.lyDoTraLai!.trim(),
          },
        });

        if (result.count === 0) {
          throw new ForbiddenException(
            'Phiếu này đã được người khác xử lý trước',
          );
        }

        // =====================================================
        // 2. PHIẾU CŨ -> TRA_LAI
        // =====================================================
        await tx.phieuDatHangTong.update({
          where: {
            id: body.id,
          },
          data: {
            trangThai: 'TRA_LAI',
            lyDoTraLai: body.lyDoTraLai!.trim(),
          },
        });

        // =====================================================
        // 3. HỦY CÁC LƯỢT CHỜ DUYỆT CÒN LẠI
        // =====================================================
        await tx.phieuDatHangDuyet.updateMany({
          where: {
            phieuId: body.id,
            trangThai: 'CHO_DUYET',
          },
          data: {
            trangThai: 'TU_CHOI',
            ngayDuyet: new Date(),
          },
        });

        // =====================================================
        // 4. LẤY MÃ GỐC
        // =====================================================
        let maGoc = phieu.maPhieu;

        if (maGoc.includes('.')) {
          maGoc = maGoc.split('.')[0];
        }

        // =====================================================
        // 5. TÌM VERSION CUỐI
        // =====================================================
        const phieuCuoi = await tx.phieuDatHangTong.findFirst({
          where: {
            OR: [
              {
                maPhieu: maGoc,
              },
              {
                maPhieu: {
                  startsWith: `${maGoc}.`,
                },
              },
            ],
          },
          orderBy: {
            id: 'desc',
          },
        });

        let lan = 1;

        if (phieuCuoi?.maPhieu?.includes('.')) {
          const parts = phieuCuoi.maPhieu.split('.');
          const soLan = Number(parts[parts.length - 1]);

          if (!Number.isNaN(soLan)) {
            lan = soLan + 1;
          }
        }

        const maPhieuMoi = `${maGoc}.${String(lan).padStart(2, '0')}`;

        // =====================================================
        // 6. COPY PHIẾU TỔNG -> TẠO PHIẾU MỚI
        // =====================================================
        const createdPhieu = await tx.phieuDatHangTong.create({
          data: {
            maPhieu: maPhieuMoi,

            tenNcc: phieu.tenNcc,
            congTy: phieu.congTy,
            diaChi: phieu.diaChi,
            mst: phieu.mst,
            ghiChuHopDong: phieu.ghiChuHopDong,

            fromDate: phieu.fromDate,
            toDate: phieu.toDate,

            thoiGianGiaoHang: phieu.thoiGianGiaoHang,

            nguoiGui: phieu.nguoiGui,

            trangThai: 'NHAP',

            phieuGocId: phieu.id,

            lyDoTraLai: null,

            createDate: new Date(),
            modifiedDate: new Date(),
          },
        });

        // =====================================================
        // 7. CHUYỂN phieuDatHangDetail SANG PHIẾU MỚI
        // =====================================================
        await tx.phieuDatHangDetail.updateMany({
          where: {
            phieuId: body.id,
          },
          data: {
            phieuId: createdPhieu.id,

            // reset số lượng duyệt
            soLuongPGDDuyet: null,
            soLuongGDDuyet: null,
          },
        });

        // =====================================================
        // 8. CHUYỂN phieuDeXuatDetail SANG PHIẾU MỚI
        // =====================================================
        await tx.phieuDeXuatDetail.updateMany({
          where: {
            phieuId: body.id,
          },
          data: {
            phieuId: createdPhieu.id,
          },
        });

        // =====================================================
        // 9. CHUYỂN xntDetail SANG PHIẾU MỚI
        // =====================================================
        await tx.xntDetail.updateMany({
          where: {
            phieuId: body.id,
          },
          data: {
            phieuId: createdPhieu.id,
          },
        });

        return createdPhieu;
      });

      // =====================================================
      // SOCKET BÁO CHO NGƯỜI GỬI
      // =====================================================
      if (phieu.nguoiGui) {
        this.socketGateway.notifyUser(phieu.nguoiGui, {
          type: 'REJECT',

          phieuId: phieu.id,
          maPhieu: phieu.maPhieu,

          newPhieuId: newPhieu.id,
          newMaPhieu: newPhieu.maPhieu,

          lyDoTraLai: body.lyDoTraLai,
        });
      }

      // =====================================================
      // HISTORY
      // =====================================================
      await this.prisma.history.create({
        data: {
          userEdit: fullName,
          module: 'DON-DE-XUAT',
          action: 'TỪ CHỐI',

          recordId: phieu.maPhieu,

          description:
            `${fullName} từ chối phiếu ${phieu.maPhieu}. ` +
            `Lý do: ${body.lyDoTraLai}. ` +
            `Đã tạo phiếu mới ${newPhieu.maPhieu}`,

          createDate: new Date(),
        },
      });

      return {
        message: 'Đã trả lại phiếu và tạo phiếu mới',

        oldPhieu: {
          id: phieu.id,
          maPhieu: phieu.maPhieu,
        },

        newPhieu: {
          id: newPhieu.id,
          maPhieu: newPhieu.maPhieu,
        },
      };
    }

    // =====================================================
    // ACTION KHÔNG HỢP LỆ
    // =====================================================
    throw new BadRequestException('Hành động không hợp lệ');
  }
}
