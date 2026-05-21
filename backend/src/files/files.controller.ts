import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FilesService } from './files.service';
import { UploadFileDto } from './dto/upload-file.dto';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 500 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const ext = file.originalname.toLowerCase();
        if (ext.endsWith('.csv') || ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only CSV and XLSX files are allowed'), false);
        }
      },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
    @CurrentUser('id') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.filesService.upload(file, dto, userId);
  }

  @Get()
  list(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.filesService.findAll(userId, page || 1, limit || 20);
  }

  @Get(':id')
  getFile(@Param('id') id: string) {
    return this.filesService.getFile(id);
  }

  @Get(':id/preview')
  getPreview(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.filesService.getPreview(id, page || 1, limit || 20);
  }

  @Delete(':id')
  deleteFile(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.filesService.deleteFile(id, userId);
  }
}
