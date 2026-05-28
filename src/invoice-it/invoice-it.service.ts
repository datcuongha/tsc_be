import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class InvoiceItService {
  prisma = new PrismaClient();

  // ----- LẤY THÔNG TIN HÓA ĐƠN ----- //
  async getDataXml() {
    const content = await this.prisma.invoiceIt.findMany({
      include: {
        invoiceItDetails: true,
      },
      orderBy: {
        ngayHd: 'desc',
      },
    });
    return { message: 'Thành công', content, date: new Date() };
  }

  // ----- IMPORT XML ----- //
  async importXml(body: any) {
    console.log(body);
    try {
      return this.prisma.$transaction(async (tx) => {
        const checkInv = await tx.invoiceIt.findFirst({
          where: {
            AND: [{ soHd: parseInt(body.soHd) }, { kyHieuHd: body.kyHieuHd }],
          },
        });

        if (checkInv) {
          throw new HttpException(
            {
              status: HttpStatus.BAD_REQUEST,
              message: `Hóa đơn số ${body.soHd} (${body.kyHieuHd}) đã tồn tại trong hệ thống.`,
            },
            HttpStatus.BAD_REQUEST,
          );
        }

        const data = await this.prisma.invoiceIt.create({
          data: {
            soHd: parseInt(body.soHd),
            kyHieuHd: body.kyHieuHd,
            ngayHd: body.ngayHd, // Là string như định nghĩa
            loaiHinh: body.loaiHinh,
            noiDung: body.noiDung || '',
            tienThue: parseInt(body.tienThue),
            tongTien: parseInt(body.tongTien),
            ptThanhToan: body.ptThanhToan || '',
            mst: body.mst,
            tenNcc: body.tenNcc,
            diaChi: body.diaChi,
            soDt: body.soDt,
            email: body.email,
            stk: body.stk,
            caNhan: body.tenNcc,
            nganHang: body.nganHang,
            webSite: body.webSite,
            createDate: new Date(),
            userId: body.userId || null,
            soTienBangChu: body.soTienBangChu,
            status: true,
          },
        });

        if (Array.isArray(body.danhSachHang) && body.danhSachHang.length > 0) {
          await tx.invoiceItDetails.createMany({
            data: body.danhSachHang.map((item) => {
              const tienThueItem = item.TSuat
                ? Math.round(
                    (parseInt(item.ThTien || '0') * parseFloat(item.TSuat)) /
                      100,
                  )
                : parseInt(item.tienThue || '0') || 0;
              return {
                invoiceItId: data.id,
                danhSachHang: item.THHDVu,
                dvt: item.DVTinh || '',
                sl: parseInt(item.SLuong),
                donGia: parseInt(item.DGia),
                thanhTienTruocVat: parseInt(item.ThTien),
                loaiThue: item.TSuat || '',
                tienThueDongHang: tienThueItem || 0,
                thanhTien: parseInt(body.thanhTien || '0'),
                tongTien: parseInt(body.tongTien || '0'),
                createDate: new Date(),
                userId: body.userId || null,
                status: true,
              };
            }),
          });
        }
        return { message: 'Thành công', data, date: new Date() };
      });
    } catch (error) {}
  }

  // ----- CREATEINV ----- //
  async createInv(body: any) {
    const checkSoHd = await this.prisma.invoiceIt.findFirst({
      where: {
        AND: [{ soHd: parseInt(body.soHd) }, { kyHieuHd: body.kyHieuHd }],
      },
    });

    if (checkSoHd) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: 'Số hóa đơn theo ký hiệu này đã tồn tại',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const tongTien = Array.isArray(body.item)
      ? body.item.reduce((sum, item) => {
          const sl = parseInt(item.sl) || 0;
          const donGia = parseFloat(item.donGia) || 0;
          const tyGia = parseFloat(item.tyGia) || 1;
          return sum + sl * donGia * tyGia;
        }, 0)
      : 0;

    const data = await this.prisma.invoiceIt.create({
      data: {
        soHd: parseInt(body.soHd),
        kyHieuHd: body.kyHieuHd,
        ngayHd: body.ngayHd,
        tenNcc: body.tenNcc,
        diaChi: body.diaChi,
        noiDung: body.noiDung,
        tongTien: tongTien,
        loaiHinh: body.loaiHinh,
        ptThanhToan: body.hinhThuc || '',
        tienThue: body.tienThue || 0,
        tyGia: body.tyGia || 1,
        createDate: new Date(),
        stk: body.stk || null,
        caNhan: body.caNhan || null,
        nganHang: body.nganHang || null,
        userId: body.userId || null,
        mst: body.mst || null,
        soTienBangChu: body.soTienBangChu || null,
        status: true,
      },
    });

    // 4️⃣ Tạo chi tiết hóa đơn
    if (Array.isArray(body.item) && body.item.length > 0) {
      await this.prisma.invoiceItDetails.createMany({
        data: body.item.map((item) => {
          const sl = parseInt(item.sl) || 0;
          const donGia = parseFloat(item.donGia) || 0;
          const tyGia = parseFloat(item.tyGia) || 1;

          const thanhTienTruocVat = sl * donGia;

          return {
            invoiceItId: data.id,
            danhSachHang: item.danhSachHang, // ✅ khớp FE
            dvt: item.dvt || '',
            sl,
            donGia,
            thanhTienTruocVat,
            loaiThue: `${item.loaiThue}%` || 'KCT',
            tienThueDongHang: item.tienThueDongHang || 0,
            thanhTien: 0, // ✅ nếu chưa có thuế
            tongTien: tongTien,
            userId: item.userId || null,
            createDate: new Date(),
            status: true,
          };
        }),
      });
    }
    return { message: 'Thành công', data, date: new Date() };
  }

  // ----- USER DELETE INVOICE ----- //
  async removeInv(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const checkInv = await tx.invoiceIt.findFirst({
        where: {
          id: Number(id),
        },
        include: {
          invoiceItDetails: true,
        },
      });

      if (!checkInv) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            message: 'Số hóa đơn này không tồn tại',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const modifiedDate = new Date();

      const removeInv = await tx.invoiceIt.update({
        where: {
          id: Number(id),
        },
        data: {
          status: false,
          modifiedDate,
        },
      });

      const detailResult = await tx.invoiceItDetails.updateMany({
        where: {
          invoiceItId: checkInv.id,
        },
        data: {
          status: false,
          modifiedDate,
        },
      });

      return {
        message: 'Xóa thành công',
        removeInv,
        date: new Date(),
      };
    });
  }

  // ----- ADMIN DELETE INVOICE ----- //

  // ----- EDIT INV ----- //
  async editInv(body: any) {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      let tongTienHang = 0;
      let tongTienThue = 0;

      // 1️⃣ TÍNH TIỀN HEADER
      if (Array.isArray(body.item)) {
        for (const item of body.item) {
          const sl = Number(item.sl) || 0;
          const donGia = Number(item.donGia) || 0;
          const ttTruocVat = sl * donGia;

          const vat = parseFloat(item.loaiThue) || 0;
          const tienThueDongHang = (ttTruocVat * vat) / 100;

          tongTienHang += ttTruocVat;
          tongTienThue += tienThueDongHang;
        }
      }

      const tongTienHeader = tongTienHang + tongTienThue;
      const tienThueHeader = tongTienThue;

      // 2️⃣ UPDATE HEADER
      const editInv = await tx.invoiceIt.update({
        where: {
          soHd_kyHieuHd: {
            soHd: Number(body.soHd),
            kyHieuHd: body.kyHieuHd,
          },
        },
        data: {
          soHd: Number(body.soHd),
          kyHieuHd: body.kyHieuHd,
          ngayHd: body.ngayHd,
          tenNcc: body.tenNcc,
          diaChi: body.diaChi,
          noiDung: body.noiDung,
          tienThue: tienThueHeader,
          tongTien: tongTienHeader,
          loaiHinh: body.loaiHinh,
          ptThanhToan: body.hinhThuc || '',
          modifiedDate: now,
          stk: body.stk || null,
          caNhan: body.caNhan || null,
          nganHang: body.nganHang || null,
          userId: body.userId || null,
          mst: body.mst || null,
          status: true,
        },
      });

      // 3️⃣ LẤY DETAIL CŨ (CHỈ CỦA HÓA ĐƠN NÀY)
      const oldDetails = await tx.invoiceItDetails.findMany({
        where: { invoiceItId: editInv.id, status: true },
        select: { id: true },
      });

      const oldIds = oldDetails.map((d) => d.id);
      const newIds: number[] = [];

      // 4️⃣ UPDATE / CREATE DETAIL (CHỈ TRÊN HÓA ĐƠN NÀY)
      if (Array.isArray(body.item)) {
        for (const item of body.item) {
          const sl = Number(item.sl) || 0;
          const donGia = Number(item.donGia) || 0;
          const ttTruocVat = sl * donGia;

          const vat = parseFloat(item.loaiThue) || 0;
          const tienThueDongHang = (ttTruocVat * vat) / 100;
          const tongTienDongHang = ttTruocVat + tienThueDongHang;

          const commonData = {
            danhSachHang: item.danhSachHang,
            dvt: item.dvt || '',
            sl,
            donGia,
            loaiThue: item.loaiThue,
            thanhTienTruocVat: ttTruocVat,
            tienThueDongHang,
            thanhTien: 0,
            tongTien: tongTienDongHang,
            status: true,
            userId: body.userId || null,
          };

          if (item.id) {
            const id = Number(item.id);
            newIds.push(id);

            await tx.invoiceItDetails.update({
              where: { id },
              data: {
                ...commonData,
                createDate: now,
              },
            });
          } else {
            const created = await tx.invoiceItDetails.create({
              data: {
                invoiceItId: editInv.id,
                ...commonData,
                modifiedDate: now,
              },
            });

            newIds.push(created.id);
          }
        }
      }

      // 5️⃣ SOFT DELETE DETAIL BỊ XÓA (CHỈ CỦA HÓA ĐƠN NÀY)
      const deletedIds = oldIds.filter((id) => !newIds.includes(id));

      if (deletedIds.length > 0) {
        await tx.invoiceItDetails.updateMany({
          where: {
            id: { in: deletedIds },
            invoiceItId: editInv.id,
          },
          data: { status: false, modifiedDate: now },
        });
      }

      return {
        message: 'Thành công',
        editInv,
        date: now,
      };
    });
  }

  // ----- UPLOAD FILE SCAN ----- //
  async uploadScan(id: number, fileName: string) {
    return this.prisma.invoiceIt.update({
      where: { id: Number(id) },
      data: {
        file: fileName,
        modifiedDate: new Date(),
      },
    });
  }
  // async uploadScan(id: number, file: Express.Multer.File) {
  //   const filePath = path.join('/filescan', file.originalname);

  //   fs.writeFileSync(filePath, file.buffer);

  //   return this.prisma.invoiceIt.update({
  //     where: { id: Number(id) },
  //     data: {
  //       file: file.originalname,
  //       modifiedDate: new Date(),
  //     },
  //   });
  // }
}
