// import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
// import { CreateSkuDto } from './dto/create-sku.dto';
// import { UpdateSkuDto } from './dto/update-sku.dto';
// import { Prisma, PrismaClient } from '@prisma/client';


// @Injectable()
// export class SkuService {

//   prisma = new PrismaClient

//   // ----- LẤY DANH MỤC HÀNG HÓA ----- //
//   async LayDanhSachSku() {
//     let content = await this.prisma.maSku.findMany({
//       orderBy: {
//         id_sku: "desc",
//       },
//       include: {
//         MaNcc: {
//           select: {
//             ten_thuong_goi: true
//           }
//         }
//       }
//     })
//     // Gộp tên thường gọi từ nhà cung cấp vào mỗi đối tượng SKU
//     content = content.map(sku => ({
//       ...sku,
//       ten_thuong_goi: sku.MaNcc?.ten_thuong_goi || 'N/A' // Gán tên thường gọi
//     }));

//     return { messenge: 'Thành Công', content, date: new Date() }
//   }


//   // ----- TẠO MÃ SKU ----- //
//   async TaoSku(body: any) {
//     // Kiểm tra nếu không có biến thể (productVariants rỗng)
//     if (!body.productVariants || body.productVariants.length === 0) {
//       // Kiểm tra xem tên sản phẩm, mã nhà cung cấp, và giá bán đã tồn tại hay chưa
//       let checkTenHang = await this.prisma.maSku.findFirst({
//         where: {
//           ten_sp: body.ten_sp,
//           ma_ncc: body.ma_ncc,
//           gia_ban: body.gia_ban,
//         },
//       });

//       if (checkTenHang) {
//         throw new HttpException({
//           status: HttpStatus.BAD_REQUEST,
//           messenge: 'Tên sản phẩm và giá bán của NCC này đã tạo',
//         }, HttpStatus.BAD_REQUEST);
//       }

//       // Lấy stt_mat_hang lớn nhất từ bảng maSku
//       let sttMatHang = await this.prisma.maSku.findFirst({
//         orderBy: {
//           stt_mat_hang: 'desc' // Sắp xếp giảm dần để lấy cái lớn nhất
//         },
//         select: {
//           stt_mat_hang: true
//         }
//       });

//       // Kiểm tra nếu có giá trị lớn nhất, nếu không thì bắt đầu từ 1
//       let nextNumberSku = sttMatHang && sttMatHang.stt_mat_hang
//         ? parseInt(sttMatHang.stt_mat_hang.slice(-5)) + 1
//         : 1;

//       // Định dạng số thứ tự thành 5 chữ số (ví dụ: 00001, 00002, ...)
//       let sttSku = nextNumberSku.toString().padStart(5, '0');

//       // Tạo mã SKU cho trường hợp không có biến thể
//       let maSku = `${body.loai_hang}${body.ma_ncc}${sttSku}${"00"}`;

//       let nhomHang = await this.prisma.nhomNganhHang.findFirst({
//         where: {
//           ma_lv3: body.id_nhom,
//         },
//         select: {
//           ma_lv1: true,  // Chọn lv1
          
//         }
//       });
//       let maLv1 = nhomHang?.ma_lv1 || null

   

//       let sttBarcode = await this.prisma.maSku.findFirst({
//         orderBy: {
//           stt_barcode: 'desc'
//         },
//         select: {
//           stt_barcode: true
//         }
//       })
//       let nextNumberBarcode = sttBarcode && sttBarcode.stt_barcode
//         ? parseInt(sttBarcode.stt_barcode.slice(-6)) + 1
//         : 1;
//       let sttBarCode = nextNumberBarcode.toString().padStart(6, '0');

//       let maBarCode = `${maLv1}${body.id_nhom}${sttBarCode}`

//       // Tính toán checksum
//       const oddDigits = maBarCode
//         .split('')
//         .filter((_, index) => index % 2 === 0) // Chọn các chữ số ở vị trí lẻ
//         .map(Number);

//       const evenDigits = maBarCode
//         .split('')
//         .filter((_, index) => index % 2 !== 0) // Chọn các chữ số ở vị trí chẵn
//         .map(Number);

//       // Tính tổng các chữ số lẻ và chẵn
//       const evenSum = evenDigits.reduce((sum, digit) => sum + digit * 3, 0);
//       const oddSum = oddDigits.reduce((sum, digit) => sum + digit, 0);
//       const totalSum = oddSum + evenSum;

//       // Tính phần dư và checksum
//       const remainder = totalSum % 10;
//       const checkSumNumber = remainder === 0 ? 0 : 10 - remainder;

//       let barCode = `${maLv1}${body.id_nhom}${sttBarCode}${checkSumNumber}`

//       // Giá bán đã có Vat

//       const giaVat = (body.gia_ban / (1 + (body.loai_thue / 100))).toFixed(2);
//       const formatGiaVat = new Intl.NumberFormat().format(parseFloat(giaVat))

//       // Tạo một SKU duy nhất cho sản phẩm
//       let data = await this.prisma.maSku.create({
//         data: {
//           loai_hang: body.loai_hang,
//           ma_ncc: body.ma_ncc,
//           stt_mat_hang: sttSku,
//           stt_thuoc_tinh: "00",
//           ma_sku: maSku,
//           barcode: barCode,
//           ten_sp: body.ten_sp,
//           ten_sp_tt: body.ten_sp,
//           tt_mau: body.mau,
//           tt_size: body.size,
//           dvt: body.dvt,
//           stt_barcode: sttBarCode,
//           gia_ban: body.gia_ban,
//           thue_suat: body.loai_thue,
//           gia_ban_truoc_vat: formatGiaVat,
//           check_sum: body.checksum,
//           ngay_tao: body.ngay_tao,
//           trang_thai: body.trang_thai,
//         }
//       });
//       return { messenge: 'Thành Công', data, date: new Date() };
//     } else {
//       // Có biến thể
//       let results = [];

//       // Lấy stt_mat_hang lớn nhất trước khi bắt đầu xử lý các biến thể
//       let sttMatHang = await this.prisma.maSku.findFirst({
//         orderBy: {
//           stt_mat_hang: 'desc',
//         },
//         select: {
//           stt_mat_hang: true,
//         },
//       });


//       // Kiểm tra nếu có giá trị lớn nhất, nếu không thì bắt đầu từ 1
//       let nextNumberSku = sttMatHang && sttMatHang.stt_mat_hang
//         ? parseInt(sttMatHang.stt_mat_hang.slice(-5)) + 1
//         : 1;
//       let nextNumberTT = 1

//       // Định dạng stt_mat_hang thành 5 chữ số
//       let sttSku = nextNumberSku.toString().padStart(5, '0');

//       // Lặp qua từng biến thể và tạo mã SKU cho mỗi biến thể
//       for (const variant of body.productVariants) {
//         // Kiểm tra biến thể đã tồn tại hay chưa
//         console.log(variant);
//         let checkVariant = await this.prisma.maSku.findFirst({
//           where: {
//             ten_sp: variant.ten_sp,
//             ma_ncc: body.ma_ncc,
//             gia_ban: variant.gia_ban,
//             tt_size: variant.size,
//             tt_mau: variant.mau,
//           },
//         });
//         console.log(checkVariant);
        
        
//         if (checkVariant) {
//           throw new HttpException({
//             status: HttpStatus.BAD_REQUEST,
//             message: `Sản phẩm ${variant.ten_sp} với size ${variant.size} và màu ${variant.mau} đã tồn tại`,
//           }, HttpStatus.BAD_REQUEST);
//         }

//         // Tăng stt_thuoc_tinh cho từng biến thể
//         let sttSkuTT = nextNumberTT.toString().padStart(2, '0');
//         nextNumberTT++;

//         // Tạo mã SKU cho biến thể
//         let maSku = `${body.loai_hang}${body.ma_ncc}${sttSku}${sttSkuTT} `;

//         let nhomHang = await this.prisma.nhomNganhHang.findFirst({
//           where: {
//             ma_lv3: body.id_nhom,
//           },
//           select: {
//             ma_lv1: true,  // Chọn lv1
          
//           }
//         });
//         let maLv1 = nhomHang?.ma_lv1 || null

//         let sttBarcode = await this.prisma.maSku.findFirst({
//           orderBy: {
//             stt_barcode: 'desc'
//           },
//           select: {
//             stt_barcode: true
//           }
//         })
//         let nextNumberBarcode = sttBarcode && sttBarcode.stt_barcode
//           ? parseInt(sttBarcode.stt_barcode.slice(-6)) + 1
//           : 1;
//         let sttBarCode = nextNumberBarcode.toString().padStart(6, '0');

//         let maBarCode = `${maLv1}${body.id_nhom}${sttBarCode}`

//         // Tính toán checksum
//         const oddDigits = maBarCode
//           .split('')
//           .filter((_, index) => index % 2 === 0) // Chọn các chữ số ở vị trí lẻ
//           .map(Number);

//         const evenDigits = maBarCode
//           .split('')
//           .filter((_, index) => index % 2 !== 0) // Chọn các chữ số ở vị trí chẵn
//           .map(Number);

//         // Tính tổng các chữ số lẻ và chẵn
//         const evenSum = evenDigits.reduce((sum, digit) => sum + digit * 3, 0);
//         const oddSum = oddDigits.reduce((sum, digit) => sum + digit, 0);
//         const totalSum = oddSum + evenSum;

//         // Tính phần dư và checksum
//         const remainder = totalSum % 10;
//         const checkSumNumber = remainder === 0 ? 0 : 10 - remainder;

//         let barCode = `${maLv1}${body.id_nhom}${sttBarCode}${checkSumNumber}`


//         // Giá bán đã có Vat

//         const giaVat = (variant.gia_ban / (1 + (body.loai_thue / 100))).toFixed(2);
//         const formatGiaVat = new Intl.NumberFormat().format(parseFloat(giaVat))


//         let fullName = variant.ten_sp;

//         if (variant.size) {
//           fullName += ` - ${variant.size}`;
//         }

//         if (variant.mau) {
//           fullName += ` - ${variant.mau}`;
//         }
//         // Tạo biến thể trong cơ sở dữ liệu
//         let dataVariant = await this.prisma.maSku.create({
//           data: {
//             loai_hang: body.loai_hang,
//             ma_ncc: body.ma_ncc,
//             stt_mat_hang: sttSku,
//             stt_thuoc_tinh: sttSkuTT,
//             ma_sku: maSku,
//             ten_sp: variant.ten_sp,
//             ten_sp_tt: fullName,
//             tt_mau: variant.mau || null,
//             tt_size: variant.size,
//             dvt: body.dvt,
//             stt_barcode: sttBarCode,
//             barcode: barCode,
//             check_sum: body.checksum,
//             gia_ban: variant.gia_ban,
//             thue_suat: body.loai_thue,
//             gia_ban_truoc_vat: formatGiaVat,
//             ngay_tao: body.ngay_tao,
//             trang_thai: body.trang_thai,
//           },
//         });

//         results.push(dataVariant);
//       }
//       return { message: 'Thành Công', data: results, date: new Date() };
//     }
//   }


//   // ----- IMPORT SKU ----- //
//   async ImportSku(body: any[]) {
//     // Sử dụng Prisma để lưu dữ liệu vào database
//     const createPromises = body.map(async (sku) => {
//       if (!sku.ma_sku) {
//         // Xử lý nếu ma_sku bị null hoặc undefined
//         console.error("SKU không tồn tại:", sku);
//         return;
//       }

//       // Lấy ma_ncc từ ten_thuong_goi hoặc kiểm tra ma_ncc tồn tại
//       const supplier = await this.prisma.maNcc.findFirst({
//         where: { ma_ncc: sku.ma_ncc }, // Kiểm tra theo ma_ncc (hoặc ten_thuong_goi nếu bạn dùng tên thay thế)
//         select: { ma_ncc: true },
//       });

//       if (!supplier) {
//         console.error(`Nhà cung cấp với mã ${sku.ma_ncc} không tồn tại`);
//         return;
//       }

//       // Kiểm tra mã SKU đã tồn tại hay chưa
//       const existingSku = await this.prisma.maSku.findUnique({
//         where: { ma_sku: sku.ma_sku },
//       });

//       if (existingSku) {
//         return this.prisma.maSku.update({
//           where: { ma_sku: sku.ma_sku },
//           data: {
//             ten_sp: sku.ten_sp,
//             ten_sp_tt: sku.ten_sp_tt,
//             ma_ncc: sku.ma_ncc,
//             dvt: sku.dvt,
//             barcode: sku.barcode,
//             gia_ban: sku.gia_ban,
//             loai_hang: sku.loai_hang,
//             gia_von: sku.gia_von || null,
//             thue_suat: sku.loai_thue,
//             ngay_sua: new Date(),
//           }
//         })
//       } else {
//         // Nếu SKU chưa tồn tại, tạo mới

//         const giaVat = Math.ceil(sku.gia_ban / (1 + (sku.loai_thue / 100))).toFixed(2);
//         const formatGiaVat = new Intl.NumberFormat().format(parseFloat(giaVat))

//         return this.prisma.maSku.create({
//           data: {
//             stt_mat_hang: sku.stt_mat_hang,
//             ma_sku: sku.ma_sku,
//             ten_sp: sku.ten_sp,
//             ten_sp_tt: sku.ten_sp_tt,
//             dvt: sku.dvt,
//             stt_barcode: sku.stt_barcode,
//             ma_ncc: sku.ma_ncc,
//             barcode: sku.barcode,
//             gia_von: sku.gia_von,
//             gia_ban_truoc_vat: formatGiaVat,
//             gia_ban: sku.gia_ban,
//             loai_hang: sku.loai_hang,
//             thue_suat: sku.loai_thue,
//             ngay_tao: new Date(),
//           },
//         });
//       }
//     });

//     await Promise.all(createPromises);
//     return { message: 'Dữ liệu đã được import thành công!' };
//   }

//   // ----- XÓA SKU ----- //
//   async XoaSku(id: number) {
//     let checkSku = await this.prisma.maSku.findFirst({
//       where: {
//         id_sku: id
//       }
//     })

//     if (!checkSku) {
//       throw new HttpException({
//         status: HttpStatus.BAD_REQUEST,
//         messenge: "Mã SKU này không tồn tại",
//       }, HttpStatus.BAD_REQUEST)
//     }

//     let removeSku = await this.prisma.maSku.update({
//       where: {
//         id_sku: id
//       },
//       data: {
//         trang_thai: true,
//         ngay_sua: new Date(),
//       }
//     })

//     return { messenge: 'Xóa thành công', removeSku, date: new Date() }
//   }

//   // ----- CẬP NHẬT VỐN -----
//   async UpdateVonSku(id: number, body: any) {
//     let checkSku = await this.prisma.maSku.findFirst({
//       where: {
//         id_sku: id
//       }
//     })

//     if (!checkSku) {
//       throw new HttpException({
//         status: HttpStatus.BAD_REQUEST,
//         messenge: "Mã SKU này không tồn tại",
//       }, HttpStatus.BAD_REQUEST)
//     }

//     let updateVonSku = await this.prisma.maSku.update({
//       where: {
//         id_sku: id
//       },
//       data: {
//         gia_von: body.gia_von,
//         ngay_sua: new Date()
//       }
//     })
//     return { messenge: "Thành công", updateVonSku, data: new Date() }
//   }

//   // ----- CẬP NHẬT SKU -----
//   async UpdateSku(body: any) {

//     const checkUpdateSku = await this.prisma.maSku.findFirst({
//       where: {
//         id_sku: body.id_sku
//       }
//     })

//     if (!checkUpdateSku) {
//       throw new HttpException({
//         status: HttpStatus.BAD_REQUEST,
//         messenge: "Mã SKU này không tồn tại"
//       }, HttpStatus.BAD_REQUEST)
//     }

//     let updateData = {
//       loai_hang: checkUpdateSku.loai_hang,
//       ma_ncc: checkUpdateSku.ma_ncc,
//       ten_sp: checkUpdateSku.ten_sp,
//       ten_sp_tt: checkUpdateSku.ten_sp_tt,
//       dvt: checkUpdateSku.dvt,
//       gia_ban: checkUpdateSku.gia_ban,
//       ma_sku: checkUpdateSku.ma_sku,
//       barcode: checkUpdateSku.barcode,
//       thue_suat: checkUpdateSku.thue_suat,
//       gia_ban_truoc_vat: checkUpdateSku.gia_ban_truoc_vat,
//       id_nhom: checkUpdateSku.id_nhom,
//       tt_mau: checkUpdateSku.tt_mau,
//       tt_size: checkUpdateSku.tt_size,
//       ngay_sua: new Date(),
//     };

//     if (body.loai_hang !== checkUpdateSku.loai_hang || body.ma_ncc !== checkUpdateSku.ma_ncc) {
//       updateData.loai_hang = body.loai_hang
//       updateData.ma_ncc = body.ma_ncc
//       const maSku = `${updateData.loai_hang}${updateData.ma_ncc}${checkUpdateSku.stt_mat_hang}${checkUpdateSku.stt_thuoc_tinh || "00"}`
//       updateData.ma_sku = maSku
//     }

//     if (body.ten_sp !== checkUpdateSku.ten_sp || body.size !== checkUpdateSku.tt_size || body.mau !== checkUpdateSku.tt_mau) {

//       let fullName = body.ten_sp;

//       if (body.size) {
//         fullName += ` - ${body.size}`;
//       }

//       if (body.mau) {
//         fullName += ` - ${body.mau}`;
//       }
//       updateData.ten_sp = body.ten_sp;
//       updateData.ten_sp_tt = fullName;
//       updateData.tt_mau = body.mau;
//       updateData.tt_size = body.size;
//     }

//     if (body.dvt !== checkUpdateSku.dvt) {
//       updateData.dvt = body.dvt;
//     }

//     if (body.id_nhom !== checkUpdateSku.id_nhom) {
//       let nhomHang = await this.prisma.nhomNganhHang.findFirst({
//         where: {
//           id_nhom: body.id_nhom,
//         },
//         select: {
//           ma_lv1: true,  // Chọn lv1
//           ma_lv3: true,  // Chọn lv3
//         }
//       });

//       let maLv1 = nhomHang?.ma_lv1 || null

//       let maLv3 = nhomHang?.ma_lv3 || null

//       // let sttBarcode = await this.prisma.maSku.findFirst({
//       //   orderBy: {
//       //     stt_barcode: 'desc'
//       //   },
//       //   select: {
//       //     stt_barcode: true
//       //   }
//       // })

//       let maBarCode = `${maLv1}${maLv3}${checkUpdateSku.stt_barcode}`

//       // Tính toán checksum
//       const oddDigits = maBarCode
//         .split('')
//         .filter((_, index) => index % 2 === 0) // Chọn các chữ số ở vị trí lẻ
//         .map(Number);

//       const evenDigits = maBarCode
//         .split('')
//         .filter((_, index) => index % 2 !== 0) // Chọn các chữ số ở vị trí chẵn
//         .map(Number);

//       // Tính tổng các chữ số lẻ và chẵn
//       const evenSum = evenDigits.reduce((sum, digit) => sum + digit * 3, 0);
//       const oddSum = oddDigits.reduce((sum, digit) => sum + digit, 0);
//       const totalSum = oddSum + evenSum;

//       // Tính phần dư và checksum
//       const remainder = totalSum % 10;
//       const checkSumNumber = remainder === 0 ? 0 : 10 - remainder;

//       let barCode = `${maBarCode}${checkSumNumber}`
//       updateData.id_nhom = body.id_nhom
//       updateData.barcode = barCode
//     }

//     if (body.loai_thue !== checkUpdateSku.thue_suat) {
//       const giaTruocVat = Math.ceil(body.gia_ban / (1 + (body.loai_thue / 100))).toFixed(2);
//       const formatGiaTruocVat = new Intl.NumberFormat().format(parseInt(giaTruocVat))
//       updateData.thue_suat = body.loai_thue;
//       updateData.gia_ban_truoc_vat = formatGiaTruocVat;
//     }

//     if (body.gia_ban !== checkUpdateSku.gia_ban) {
//       updateData.gia_ban = body.gia_ban
//     }


//     let UpdateSku = await this.prisma.maSku.update({
//       where: {
//         id_sku: body.id_sku
//       },
//       data: updateData

//     })
//     return { messenge: 'Thành công', UpdateSku, date: new Date() }

//   }

// }


