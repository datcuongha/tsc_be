import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { getAllProducts, saveProductsToDatabase } from 'src/kiotViet/product';

const normalizeCode = (value: unknown): string =>
  String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .trim()
    .toUpperCase();

const normalizeExcelKey = (value: string): string =>
  value
    .replace(/\u00a0/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const getPurchaseTaxValue = (relation: unknown): string => {
  // Hỗ trợ cả quan hệ object và array
  const tax = Array.isArray(relation) ? relation[0] : relation;

  if (!tax || typeof tax !== 'object' || !('value' in tax)) {
    return '0';
  }

  const value = (
    tax as {
      value?: unknown;
    }
  ).value;

  return value != null ? String(value) : '0';
};

@Injectable()
export class DanhmucService {
  prisma = new PrismaClient();

  // ----- LẤY DANH MỤC HÀNG HOÁ ----- //
  async getAllDmhh(page = 1, limit = 100, search = '') {
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            {
              maHang: {
                contains: search,
              },
            },
            {
              tenHang: {
                contains: search,
              },
            },
          ],
        }
      : {};

    const [content, total] = await Promise.all([
      this.prisma.dmhhFast.findMany({
        where,
        include: {
          dmncc: true,
        },
        orderBy: {
          createDate: 'desc',
        },
        skip,
        take: limit,
      }),

      this.prisma.dmhhFast.count({
        where,
      }),
    ]);

    return {
      message: 'Thành công',
      content,
      total,
      page,
      limit,
      date: new Date(),
    };
  }

  // ----- LÁY DANH MỤC LOẠI VĂN BẢN ----- //
  async getAllDmLoaiVb() {
    const content = await this.prisma.dmLoaiVb.findMany({});
    return { message: 'Thành công', content, date: new Date() };
  }

  // ----- LẤY DANH MỤC KHO ----- //
  async getAllKho() {
    const content = await this.prisma.dmChiNhanh.findMany({
      where: {
        status: true,
      },
    });
    return { message: 'Thành cônng', content, date: new Date() };
  }

  // ----- LẤY TOKEN KIOT ----- //
  async getAccessTokenKiot() {
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', '33bce6de-32c6-47ad-b734-9e0573b3f474');
      params.append(
        'client_secret',
        '4DB765D5BA7D02639828C3A7294900099B097CDE',
      );
      // params.append("Retailer","benthanhtsc")

      const response = await axios.post(
        'https://id.kiotviet.vn/connect/token',
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      return `Bearer ${response.data.access_token}`;
    } catch (error) {
      console.error(
        'Error getting access token:',
        error.response?.data || error.message,
      );
      return null;
    }
  }

  // ----- LẤY DANH MỤC NCC -----//
  async getAllDmncc() {
    const content = await this.prisma.dmncc.findMany({
      where: {
        status: true,
      },
    });
    return { message: 'Thành công', content, date: new Date() };
  }

  // ----- LẤY API DANH MỤC HÀNG HOÁ KIOT ----- //
  async syncDmhhKiot() {
    const accessTokenKiot = await this.getAccessTokenKiot();

    const products = await getAllProducts(accessTokenKiot);

    if (!products.length) {
      return {
        message: 'Không có dữ liệu mới',
      };
    }

    await saveProductsToDatabase(products);

    await this.prisma.synsTimeKiot.upsert({
      where: {
        keyName: 'LAST_SYNC_KIOT_PRODUCT',
      },
      update: {
        value: new Date().toISOString(),
      },
      create: {
        keyName: 'LAST_SYNC_KIOT_PRODUCT',
        value: new Date().toISOString(),
      },
    });

    return {
      message: 'Đồng bộ thành công',
      total: products.length,
    };
  }

  // ----- IMPORT DANH MỤC HÀNG HOÁ FAST ----- //
  // async importDmhh(body: any[]) {
  //   const chunkSize = 100;

  //   // xoá khoảng trắng
  //   body = body.map((item) => {
  //     const newItem: any = {};

  //     Object.entries(item).forEach(([key, value]) => {
  //       const normalizedKey = key.trim().replace(/\s+/g, ' ');

  //       newItem[normalizedKey] = value;
  //     });

  //     return newItem;
  //   });

  //   // Load VAT Kiot 1 lần
  //   const kiotProducts = await this.prisma.dmhhKiot.findMany({
  //     select: {
  //       code: true,
  //       dnhhKiotPurchaseTax: {
  //         select: {
  //           value: true,
  //         },
  //       },
  //     },
  //   });

  //   const vatMap = new Map<string, string>();

  //   kiotProducts.forEach((item) => {
  //     vatMap.set(
  //       item.code || '',
  //       item.dnhhKiotPurchaseTax?.[0]?.value?.toString() || '0',
  //     );
  //   });

  //   for (let i = 0; i < body.length; i += chunkSize) {
  //     const chunk = body.slice(i, i + chunkSize);
  //     // ===============================
  //     // 1. Lấy danh sách NCC duy nhất
  //     // ===============================
  //     const nccMap = new Map<
  //       string,
  //       {
  //         maNcc: string;
  //         tenNcc: string;
  //       }
  //     >();

  //     for (const item of chunk) {
  //       const maNcc = item['Mã NCC']?.toString().trim();

  //       if (!maNcc) continue;

  //       if (!nccMap.has(maNcc)) {
  //         nccMap.set(maNcc, {
  //           maNcc,
  //           tenNcc: item['Thương hiệu']?.toString().trim() || '',
  //         });
  //       }
  //     }

  //     // ===============================
  //     // 2. Tạo / cập nhật NCC
  //     // ===============================
  //     for (const ncc of nccMap.values()) {
  //       try {
  //         await this.prisma.dmncc.upsert({
  //           where: {
  //             maNcc: ncc.maNcc,
  //           },
  //           update: {
  //             // Nếu muốn cập nhật tên NCC khi import
  //             tenNcc: ncc.tenNcc,
  //             modifiedDate: new Date(),
  //           },
  //           create: {
  //             maNcc: ncc.maNcc,
  //             tenNcc: ncc.tenNcc,
  //             status: false,
  //             createDate: new Date(),
  //           },
  //         });
  //       } catch (error) {
  //         console.error(
  //           `❌ Lỗi NCC: ${ncc.maNcc}`,
  //           error instanceof Error ? error.message : error,
  //         );
  //       }
  //     }

  //     // ===============================
  //     // 3. Import SKU song song
  //     // ===============================
  //     await Promise.all(
  //       chunk.map(async (item) => {
  //         try {
  //           const maHang = item.SKU?.toString().trim();

  //           if (!maHang) return;

  //           const maNcc = item['Mã NCC']?.toString().trim() || null;

  //           const vat = vatMap.get(maHang) || '0';
  //           console.log('vat:', vat);

  //           // console.log('COLUMNS:', Object.keys(item));
  //           // console.log('ITEM:', item);
  //           // console.log('IMPORT:', {
  //           //   maHang,
  //           //   giaMuaRaw: item['Giá mua từ NCC'],
  //           //   giaMua: Number(item['Giá mua từ NCC'] || 0),
  //           //   giaBanRaw: item['Giá bán sau thuế'],
  //           //   giaBan: Number(item['Giá bán sau thuế'] || 0),
  //           // });
  //           await this.prisma.dmhhFast.upsert({
  //             where: {
  //               maHang,
  //             },

  //             update: {
  //               maNcc,
  //               barcode: item.Barcode?.toString() || null,
  //               tenHang: item['Tên sản phẩm + thuộc tính'] || '',
  //               giaMua: Number(item['Giá mua từ NCC'] || 0),
  //               giaBan: Number(item['Giá bán sau thuế'] || 0),
  //               vat,
  //               dvt: item['Đvt'] || null,
  //               status: true,
  //               modifiedDate: new Date(),
  //             },

  //             create: {
  //               maHang,
  //               maNcc,
  //               barcode: item.Barcode?.toString() || null,
  //               tenHang: item['Tên sản phẩm + thuộc tính'] || '',
  //               giaMua: Number(item['Giá mua từ NCC'] || 0),
  //               giaBan: Number(item['Giá bán sau thuế'] || 0),
  //               vat,
  //               dvt: item['Đvt'] || null,
  //               status: true,
  //               createDate: new Date(),
  //             },
  //           });

  //           console.log(`✅ ${maHang}`);
  //         } catch (error) {
  //           console.error(
  //             `❌ Lỗi import SKU: ${item?.SKU}`,
  //             error instanceof Error ? error.message : error,
  //           );
  //         }
  //       }),
  //     );
  //     console.log(
  //       `Đã xử lý ${Math.min(i + chunkSize, body.length)}/${body.length}`,
  //     );
  //   }

  //   return {
  //     success: true,
  //     total: body.length,
  //     message: 'Import danh mục hàng hóa thành công',
  //   };
  // }
  async importDmhh(body: any[]) {
    if (!Array.isArray(body) || body.length === 0) {
      throw new BadRequestException('File không có dữ liệu');
    }

    const chunkSize = 100;
    const concurrentSize = 10;

    let successCount = 0;
    let errorCount = 0;
    let noTaxCount = 0;

    // ==========================================
    // 1. CHUẨN HÓA TÊN CỘT TRONG FILE EXCEL
    // ==========================================
    const normalizedBody = body.map((item) => {
      const normalizedItem: Record<string, unknown> = {};

      Object.entries(item).forEach(([key, value]) => {
        normalizedItem[normalizeExcelKey(key)] = value;
      });

      return normalizedItem;
    });

    // ==========================================
    // 2. LẤY THUẾ MUA TỪ DANH MỤC KIOT
    // ==========================================
    const kiotProducts = await this.prisma.dmhhKiot.findMany({
      where: {
        code: {
          not: null,
        },
      },

      select: {
        code: true,

        dnhhKiotPurchaseTax: {
          select: {
            taxId: true,
            name: true,
            value: true,
          },
        },
      },
    });

    // Map: mã hàng → VAT
    const vatMap = new Map<string, string>();

    for (const product of kiotProducts) {
      const code = normalizeCode(product.code);

      if (!code) continue;

      const vat = getPurchaseTaxValue(product.dnhhKiotPurchaseTax);

      vatMap.set(code, vat);
    }

    console.log(`Đã tải VAT của ${vatMap.size} mã hàng Kiot`);

    console.log('Kiểm tra VAT THP056490608:', {
      exists: vatMap.has('THP056490608'),
      vat: vatMap.get('THP056490608'),
    });

    // ==========================================
    // 3. XỬ LÝ FILE THEO TỪNG CHUNK
    // ==========================================
    for (let index = 0; index < normalizedBody.length; index += chunkSize) {
      const chunk = normalizedBody.slice(index, index + chunkSize);

      // ========================================
      // 4. LẤY DANH SÁCH NCC KHÔNG TRÙNG
      // ========================================
      const nccMap = new Map<
        string,
        {
          maNcc: string;
          tenNcc: string;
        }
      >();

      for (const item of chunk) {
        const maNcc = String(item['Mã NCC'] ?? '').trim();

        if (!maNcc) continue;

        if (!nccMap.has(maNcc)) {
          nccMap.set(maNcc, {
            maNcc,

            tenNcc: String(item['Thương hiệu'] ?? '').trim(),
          });
        }
      }

      // ========================================
      // 5. TẠO HOẶC CẬP NHẬT NCC
      // ========================================
      for (const ncc of nccMap.values()) {
        try {
          const now = new Date();

          await this.prisma.dmncc.upsert({
            where: {
              maNcc: ncc.maNcc,
            },

            update: {
              tenNcc: ncc.tenNcc,
              modifiedDate: now,
            },

            create: {
              maNcc: ncc.maNcc,
              tenNcc: ncc.tenNcc,
              status: false,
              createDate: now,
            },
          });
        } catch (error) {
          console.error(
            `❌ Lỗi NCC ${ncc.maNcc}:`,
            error instanceof Error ? error.message : error,
          );
        }
      }

      // ========================================
      // 6. IMPORT SKU THEO NHÓM 10 SẢN PHẨM
      // ========================================
      for (
        let skuIndex = 0;
        skuIndex < chunk.length;
        skuIndex += concurrentSize
      ) {
        const skuBatch = chunk.slice(skuIndex, skuIndex + concurrentSize);

        await Promise.all(
          skuBatch.map(async (item) => {
            const maHang = normalizeCode(item.SKU);

            if (!maHang) {
              errorCount += 1;

              console.error('❌ Dòng Excel không có SKU');

              return;
            }

            try {
              const now = new Date();

              const maNcc = String(item['Mã NCC'] ?? '').trim() || null;

              const barcode = String(item.Barcode ?? '').trim() || null;

              const tenHang = String(
                item['Tên sản phẩm + thuộc tính'] ?? '',
              ).trim();

              const giaMua = Number(item['Giá mua từ NCC']) || 0;

              const giaBan = Number(item['Giá bán sau thuế']) || 0;

              const dvt = String(item['Đvt'] ?? '').trim() || null;

              const vatFromMap = vatMap.get(maHang);
              const vat = vatFromMap ?? '0';

              if (vatFromMap === undefined) {
                noTaxCount += 1;

                console.warn(`⚠️ Không tìm thấy VAT cho SKU ${maHang}`);
              }

              console.log('IMPORT SKU:', {
                maHang,
                vat,
                foundTax: vatMap.has(maHang),
              });

              await this.prisma.dmhhFast.upsert({
                where: {
                  maHang,
                },

                update: {
                  maNcc,
                  barcode,
                  tenHang,
                  giaMua,
                  giaBan,
                  vat,
                  dvt,
                  status: true,
                  modifiedDate: now,
                },

                create: {
                  maHang,
                  maNcc,
                  barcode,
                  tenHang,
                  giaMua,
                  giaBan,
                  vat,
                  dvt,
                  status: true,
                  createDate: now,
                },
              });

              successCount += 1;

              console.log(`✅ ${maHang} - VAT ${vat}%`);
            } catch (error) {
              errorCount += 1;

              console.error(
                `❌ Lỗi import SKU ${maHang}:`,
                error instanceof Error ? error.message : error,
              );
            }
          }),
        );
      }

      console.log(
        `Đã xử lý ${Math.min(
          index + chunkSize,
          normalizedBody.length,
        )}/${normalizedBody.length}`,
      );
    }

    return {
      success: errorCount === 0,
      total: normalizedBody.length,
      successCount,
      errorCount,
      noTaxCount,

      message:
        errorCount === 0
          ? 'Import danh mục hàng hóa thành công'
          : `Import hoàn tất: thành công ${successCount}, lỗi ${errorCount}`,
    };
  }

  // ----- IMPORT FILE ĐỊNH MỨC
  async importDinhMuc(file: Express.Multer.File, fullName: string) {
    if (!file) {
      throw new BadRequestException('Không có file upload');
    }

    const now = new Date();

    const fileBytes = Uint8Array.from(file.buffer);

    // Tìm file hiện tại∏
    const fileOld = await this.prisma.fileTemp.findFirst({
      orderBy: {
        id: 'asc',
      },
    });

    let result;

    if (fileOld) {
      // Có rồi -> ghi đè file cũ
      result = await this.prisma.fileTemp.update({
        where: {
          id: fileOld.id,
        },
        data: {
          fileName: file.originalname,
          file: fileBytes,
          modifiedDate: now,
        },
      });
    } else {
      // Chưa có -> tạo mới
      result = await this.prisma.fileTemp.create({
        data: {
          fileName: file.originalname,
          file: fileBytes,
          createDate: now,
          modifiedDate: now,
        },
      });
    }

    await this.prisma.history.create({
      data: {
        userEdit: fullName,
        module: 'DANH-MUC',
        action: 'IMPORT FILE ĐỊNH MỨC',
        recordId: String(result.id),
        description: `${fullName} đã import file định mức`,
        createDate: now,
      },
    });

    return {
      message: 'Đã lưu file định mức',
      content: {
        id: result.id,
        fileName: result.fileName,
        createDate: result.createDate,
        modifiedDate: result.modifiedDate,
      },
    };
  }

  // ----- DOWNLOAD FILE ĐỊNH MỨC ----- //
  async downloadDinhMuc() {
    const fileTemp = await this.prisma.fileTemp.findFirst({
      orderBy: {
        id: 'asc',
      },
      select: {
        id: true,
        fileName: true,
        file: true,
      },
    });

    if (!fileTemp?.file) {
      throw new NotFoundException('Không tìm thấy file định mức');
    }

    return {
      fileName: fileTemp.fileName || 'file-dinh-muc.xlsx',

      // Prisma Bytes/Uint8Array → Node Buffer
      fileBuffer: Buffer.from(fileTemp.file),
    };
  }

  // ----- IMPORT NCC ----- //
  async importDmncc(body: any[]) {
    // Lọc bỏ dòng trống
    const data = body.filter(
      (item) =>
        item['Mã nhà cung cấp'] &&
        item['Mã nhà cung cấp'].toString().trim() !== '',
    );

    const chunkSize = 100;

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);

      await Promise.all(
        chunk.map(async (item, index) => {
          try {
            const maNcc = item['Mã nhà cung cấp']?.toString().trim();

            if (!maNcc) {
              console.log(`Bỏ qua dòng ${i + index + 2}: thiếu mã NCC`);
              return;
            }

            await this.prisma.dmncc.upsert({
              where: {
                maNcc,
              },
              update: {
                tenNcc: item['Tên nhà cung cấp'] || null,
                email: item['Email'] || null,
                phone: item['Điện thoại'] || null,
                diaChi: item['Địa chỉ'] || null,
                mst: item['Mã số thuế'] || null,
                congTy: item['Công ty'] || null,
                noteHd: item['Ghi chú hợp đồng'] || null,
                status: true,
                modifiedDate: new Date(),
              },
              create: {
                maNcc,
                tenNcc: item['Tên nhà cung cấp'] || null,
                email: item['Email'] || null,
                phone: item['Điện thoại'] || null,
                diaChi: item['Địa chỉ'] || null,
                mst: item['Mã số thuế'] || null,
                congTy: item['Công ty'] || null,
                noteHd: item['Ghi chú hợp đồng'] || null,
                status: true,
                createDate: new Date(),
              },
            });
          } catch (error: any) {
            console.error(
              `Lỗi NCC ${item['Mã nhà cung cấp']}`,
              error?.message || error,
            );
          }
        }),
      );

      console.log(
        `Đã xử lý ${Math.min(i + chunkSize, data.length)}/${data.length}`,
      );
    }

    return {
      success: true,
      total: data.length,
      message: 'Import nhà cung cấp thành công',
    };
  }

  // ----- TÌM MÃ HÀNG ----- //
  async getDmhhByMaHang(maHang: string) {
    console.log(maHang);

    const content = await this.prisma.dmhhFast.findFirst({
      where: {
        maHang: maHang.trim(),
      },
      select: {
        id: true,
        maHang: true,
        tenHang: true,
        giaBan: true,
        giaMua: true,
        dvt: true,
        vat: true,
        dmncc: {
          select: {
            maNcc: true,
            tenNcc: true,
          },
        },
      },
    });
    console.log(content);

    return {
      message: 'Thành công',
      content,
      date: new Date(),
    };
  }
}
