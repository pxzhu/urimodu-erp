import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { FilesModule } from "../files/files.module";
import { ImportExportController } from "./controllers/import-export.controller";
import { ImportExportService } from "./services/import-export.service";

@Module({
  imports: [AuditModule, FilesModule],
  controllers: [ImportExportController],
  providers: [ImportExportService],
  exports: [ImportExportService]
})
export class ImportExportModule {}
