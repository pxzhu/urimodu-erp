import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentAuth } from "../../../common/decorators/auth-context.decorator";
import { ApiCompanyContextHeader } from "../../../common/decorators/api-company-context-header.decorator";
import type { AuthContext, RequestWithAuth } from "../../../common/auth/request-context";
import { SessionAuthGuard } from "../../../common/guards/session-auth.guard";
import { getHeaderValue } from "../../../common/utils/request.util";
import { LoginDto } from "../dto/login.dto";
import { LoginResponseDto } from "../dto/login-response.dto";
import { AuthService } from "../services/auth.service";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @ApiOperation({ summary: "Local login (dev)" })
  @ApiOkResponse({ type: LoginResponseDto })
  login(@Body() dto: LoginDto, @Req() request: RequestWithAuth) {
    return this.authService.login(dto, request.ip, getHeaderValue(request.headers["user-agent"]));
  }

  @Post("logout")
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  @ApiCompanyContextHeader(false)
  @ApiOperation({ summary: "Logout current session" })
  logout(@CurrentAuth() auth: AuthContext, @Req() request: RequestWithAuth) {
    return this.authService.logout(auth, request.ip, getHeaderValue(request.headers["user-agent"]));
  }

  @Get("me")
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  @ApiCompanyContextHeader(false)
  @ApiOperation({ summary: "Get current user and memberships" })
  me(@CurrentAuth() auth: AuthContext) {
    return this.authService.me(auth);
  }
}
