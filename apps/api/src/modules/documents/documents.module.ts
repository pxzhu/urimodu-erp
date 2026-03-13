import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { FilesModule } from "../files/files.module";
import { DocumentsController } from "./controllers/documents.controller";
import { DocumentRenderService } from "./services/document-render.service";
import { DocumentsService } from "./services/documents.service";

@Module({
  imports: [AuditModule, FilesModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentRenderService],
  exports: [DocumentsService]
})
export class DocumentsModule {}
