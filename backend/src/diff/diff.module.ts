import { Module } from '@nestjs/common';
import { DiffController } from './diff.controller';
import { DiffService } from './diff.service';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [FilesModule],
  controllers: [DiffController],
  providers: [DiffService],
})
export class DiffModule {}
