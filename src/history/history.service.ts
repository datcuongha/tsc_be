import { Injectable } from '@nestjs/common';
import { CreateHistoryDto } from './dto/create-history.dto';
import { UpdateHistoryDto } from './dto/update-history.dto';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class HistoryService {
  prisma = new PrismaClient();

  async getAllHistory() {
    const content = await this.prisma.history.findMany({
      orderBy: {
        id: 'desc',
      },
    });
    return { message: 'Thành công', content, date: new Date() };
  }
}
