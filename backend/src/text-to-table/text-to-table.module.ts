import { Module } from '@nestjs/common';
import { TextToTableController } from './text-to-table.controller';
import { TextToTableService } from './text-to-table.service';
import { TextParserService } from './engine/text-parser.service';
import { TableCreatorService } from './engine/table-creator.service';
import { Hl7ParserService } from './engine/hl7-parser.service';
import { Hl7FlatParserService } from './engine/hl7-flat-parser.service';
import { DatabaseConnectionsModule } from '../database-connections/database-connections.module';

@Module({
  imports: [DatabaseConnectionsModule],
  controllers: [TextToTableController],
  providers: [TextToTableService, TextParserService, TableCreatorService, Hl7ParserService, Hl7FlatParserService],
})
export class TextToTableModule {}
