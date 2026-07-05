import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { FilesModule } from './files/files.module';
import { MappingsModule } from './mappings/mappings.module';
import { TemplatesModule } from './templates/templates.module';
import { TransformationsModule } from './transformations/transformations.module';
import { ProfilesModule } from './profiles/profiles.module';
import { JobsModule } from './jobs/jobs.module';
import { DatabaseConnectionsModule } from './database-connections/database-connections.module';
import { ValidationModule } from './validation/validation.module';
import { ExportModule } from './export/export.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { EmailModule } from './email/email.module';
import { TextToTableModule } from './text-to-table/text-to-table.module';
import { SpecEvaluatorModule } from './spec-evaluator/spec-evaluator.module';
import { SpecBuilderModule } from './spec-builder/spec-builder.module';
import { SqlScriptsModule } from './sql-scripts/sql-scripts.module';
import { DatabaseMigrationModule } from './database-migration/database-migration.module';
import { TemplateGeneratorModule } from './template-generator/template-generator.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      limit: 100,
      ttl: 60000,
    }]),
    PrismaModule,
    AuthModule,
    FilesModule,
    MappingsModule,
    TemplatesModule,
    TransformationsModule,
    ProfilesModule,
    JobsModule,
    ValidationModule,
    ExportModule,
    NotificationsModule,
    DatabaseConnectionsModule,
    AdminModule,
    EmailModule,
    TextToTableModule,
    SpecEvaluatorModule,
    SpecBuilderModule,
    SqlScriptsModule,
    DatabaseMigrationModule,
    TemplateGeneratorModule,
  ],
})
export class AppModule {}
