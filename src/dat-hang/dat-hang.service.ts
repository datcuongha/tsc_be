import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class DatHangService {
  prisma = new PrismaClient();

  // ----- LẤY TÁT CẢ ĐƠN ĐẶT HÀNG ----- //
  async getAllDatHang() {
    const content = await this.prisma.phieuDatHang.findMany({
      include: {
        detailPhieuDatHang: true,
        detailPhieuDeXuat: true,
      },
      orderBy: {
        id: 'desc',
      },
    });
    return { message: 'Thành công', content, date: new Date() };
  }

  // ----- CẬP NHẬP THÔNG TIN ĐƠN ĐỀ XUẤT ----- //
  async editDonDeXuat(body: any, currentUser: string) {
    const checkMaPhieu = await this.prisma.phieuDatHang.findFirst({
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

    for (const item of body.detailPhieuDatHang) {
      const oldItem = await this.prisma.detailPhieuDatHang.findUnique({
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

    for (const item of body.detailPhieuDatHang) {
      const oldItem: any = oldDataMap.get(Number(item.id));

      if (!oldItem) continue;

      const diff: any = {};

      if (Number(oldItem.kySoLieu) !== Number(item.kySoLieu)) {
        diff.kySoLieu = {
          old: oldItem.kySoLieu,
          new: item.kySoLieu,
        };
      }
      if (Number(oldItem.giamGia) !== Number(item.giamGia)) {
        diff.giamGia = {
          old: oldItem.giamGia,
          new: Number(item.giamGia),
        };
      }

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
          kySoLieu: oldItem.kySoLieu,
          giamGia: oldItem.giamGia,
          ghiChuHangHoa: oldItem.ghiChuHangHoa,
        });

        newData.push({
          id: oldItem.id,
          maHang: oldItem.maHang,
          kySoLieu: item.kySoLieu,
          giamGia: Number(item.giamGia),
          ghiChuHangHoa: item.ghiChuHangHoa,
        });
      }
    }

    // Update dữ liệu
    await Promise.all(
      body.detailPhieuDatHang.map((item: any) =>
        this.prisma.detailPhieuDatHang.update({
          where: {
            id: Number(item.id),
          },
          data: {
            kySoLieu: item.kySoLieu,
            giamGia: Number(item.giamGia) || 0,
            ghiChuHangHoa: item.ghiChuHangHoa || '',
          },
        }),
      ),
    );

    await this.prisma.phieuDatHang.update({
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

  // ----- CẬP NHẬT THÔNG TIN TM DUYỆT SỐ LƯỢNG ----- //
  async editDatHangTM(body: any, currentUser: string) {
    const checkMaPhieu = await this.prisma.phieuDatHang.findFirst({
      where: {
        id: body.maPhieuId,
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
      const oldItem = await this.prisma.detailPhieuDeXuat.findUnique({
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
        });

        newData.push({
          id: item.id,
          maHang: item.maHang,
          tenHang: item.tenHang,
          thuMuaNhap: item.thuMuaNhap,
        });
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. update detail đề xuất
      await Promise.all(
        body.details.map((item: any) =>
          tx.detailPhieuDeXuat.update({
            where: {
              id: item.id,
            },
            data: {
              thuMuaNhap: Number(item.thuMuaNhap) || 0,
            },
          }),
        ),
      );

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
      await Promise.all(
        Object.entries(grouped).map(([maHang, total]) =>
          tx.detailPhieuDatHang.updateMany({
            where: {
              maPhieuId: body.maPhieuId,
              maHang,
            },
            data: {
              soLuong: Number(total),
            },
          }),
        ),
      );

      // 4. update header
      await tx.phieuDatHang.update({
        where: {
          id: body.maPhieuId,
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
        recordId: String(body.maPhieuId),
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
}
