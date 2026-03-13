import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import type { AuthContext, RequestWithAuth } from "../../../common/auth/request-context";
import { CurrentAuth } from "../../../common/decorators/auth-context.decorator";
import { ApiCompanyContextHeader } from "../../../common/decorators/api-company-context-header.decorator";
import { SessionAuthGuard } from "../../../common/guards/session-auth.guard";
import { getHeaderValue } from "../../../common/utils/request.util";
import { AddDocumentVersionDto } from "../dto/add-document-version.dto";
import { CreateDocumentDto } from "../dto/create-document.dto";
import { RenderDocumentPdfDto } from "../dto/render-document-pdf.dto";
import { DocumentsService } from "../services/documents.service";

@ApiTags("documents")
@ApiBearerAuth()
@ApiCompanyContextHeader(false)
@Controller()
@UseGuards(SessionAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get("document-templates")
  @ApiOperation({ summary: "List active document templates" })
  listTemplates(@CurrentAuth() auth: AuthContext) {
    return this.documentsService.listTemplates(auth);
  }

  @Get("documents")
  @ApiOperation({ summary: "List documents in current company" })
  listDocuments(@CurrentAuth() auth: AuthContext) {
    return this.documentsService.listDocuments(auth);
  }

  @Get("documents/:id")
  @ApiOperation({ summary: "Get document detail with versions and approval history" })
  getDocument(@CurrentAuth() auth: AuthContext, @Param("id") documentId: string) {
    return this.documentsService.getDocument(auth, documentId);
  }

  @Post("documents")
  @ApiOperation({ summary: "Create document from template" })
  createDocument(@CurrentAuth() auth: AuthContext, @Body() dto: CreateDocumentDto, @Req() req: RequestWithAuth) {
    return this.documentsService.createDocument(auth, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }

  @Post("documents/:id/versions")
  @ApiOperation({ summary: "Create next document version" })
  addVersion(
    @CurrentAuth() auth: AuthContext,
    @Param("id") documentId: string,
    @Body() dto: AddDocumentVersionDto,
    @Req() req: RequestWithAuth
  ) {
    return this.documentsService.addVersion(auth, documentId, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }

  @Post("documents/:id/render-pdf")
  @ApiOperation({ summary: "Render document version to PDF and store file" })
  renderPdf(
    @CurrentAuth() auth: AuthContext,
    @Param("id") documentId: string,
    @Body() dto: RenderDocumentPdfDto,
    @Req() req: RequestWithAuth
  ) {
    return this.documentsService.renderPdf(auth, documentId, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }
}
