import { Module } from "@nestjs/common";

import { StorageModule } from "../../common/storage/storage.module";
import { AuditModule } from "../audit/audit.module";
import { FilesController } from "./controllers/files.controller";
import { FilesService } from "./services/files.service";

@Module({
  imports: [AuditModule, StorageModule],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService]
})
export class FilesModule {}
