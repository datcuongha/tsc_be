import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class SoHoaService {
  prisma = new PrismaClient();

  // ----- LẤY DANH SÁCH SÔ HOÁ ----- //
  // async getAllSoHoa() {
  //   const content = await this.prisma.soHoa.find
  // }
}
