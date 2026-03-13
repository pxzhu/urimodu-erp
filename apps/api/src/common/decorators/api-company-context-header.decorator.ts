import { applyDecorators } from "@nestjs/common";
import { ApiHeader } from "@nestjs/swagger";

export function ApiCompanyContextHeader(required = true) {
  return applyDecorators(
    ApiHeader({
      name: "x-company-id",
      required,
      description:
        "Company context for membership-scoped authorization. If omitted, server may fall back to the first active membership.",
      schema: {
        type: "string"
      }
    })
  );
}
