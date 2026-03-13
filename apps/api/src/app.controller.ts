import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { AppService } from "./app.service";

@ApiTags("system")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("health")
  @ApiOkResponse({
    schema: {
      properties: {
        status: { type: "string", example: "ok" },
        service: { type: "string", example: "api" },
        timestamp: { type: "string", format: "date-time" }
      }
    }
  })
  health() {
    return this.appService.health();
  }
}
