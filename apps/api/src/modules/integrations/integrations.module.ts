import { Module } from "@nestjs/common";

import { AttendanceModule } from "../attendance/attendance.module";
import { IntegrationsController } from "./controllers/integrations.controller";
import { IntegrationsService } from "./services/integrations.service";

@Module({
  imports: [AttendanceModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService]
})
export class IntegrationsModule {}
