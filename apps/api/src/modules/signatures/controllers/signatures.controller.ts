import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import type { AuthContext, RequestWithAuth } from "../../../common/auth/request-context";
import { CurrentAuth } from "../../../common/decorators/auth-context.decorator";
import { ApiCompanyContextHeader } from "../../../common/decorators/api-company-context-header.decorator";
import { SessionAuthGuard } from "../../../common/guards/session-auth.guard";
import { getHeaderValue } from "../../../common/utils/request.util";
import { CreateSignatureAssetDto } from "../dto/create-signature-asset.dto";
import { SignaturesService } from "../services/signatures.service";

@ApiTags("signatures")
@ApiBearerAuth()
@ApiCompanyContextHeader(false)
@Controller("signatures")
@UseGuards(SessionAuthGuard)
export class SignaturesController {
  constructor(private readonly signaturesService: SignaturesService) {}

  @Get("mine")
  @ApiOperation({ summary: "List my signature/seal assets" })
  listMine(@CurrentAuth() auth: AuthContext) {
    return this.signaturesService.listMine(auth);
  }

  @Post()
  @ApiOperation({ summary: "Create signature/seal asset from uploaded file" })
  create(@CurrentAuth() auth: AuthContext, @Body() dto: CreateSignatureAssetDto, @Req() req: RequestWithAuth) {
    return this.signaturesService.create(auth, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }
}
