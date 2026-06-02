import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { HistoryService } from './history.service';
import { CreateHistoryDto } from './dto/create-history.dto';
import { UpdateHistoryDto } from './dto/update-history.dto';

@Controller('api/history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  // ----- LÂY THÔNG TIN LỊCH SỬ ----- //
  @Get('getAllHistory')
  getAllHistory() {
    return this.historyService.getAllHistory();
  }
}
