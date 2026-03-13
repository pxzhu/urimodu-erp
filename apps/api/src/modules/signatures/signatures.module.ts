import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { FilesModule } from "../files/files.module";
import { SignaturesController } from "./controllers/signatures.controller";
import { SignaturesService } from "./services/signatures.service";

@Module({
  imports: [AuditModule, FilesModule],
  controllers: [SignaturesController],
  providers: [SignaturesService],
  exports: [SignaturesService]
})
export class SignaturesModule {}
