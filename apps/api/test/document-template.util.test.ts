import assert from "node:assert/strict";
import test from "node:test";

import { renderHtmlTemplate } from "../src/modules/documents/services/document-template.util";

test("renderHtmlTemplate interpolates nested keys and escapes html", () => {
  const rendered = renderHtmlTemplate("<h1>{{title}}</h1><p>{{employee.name}}</p><p>{{reason}}</p>", {
    title: "휴가 신청",
    employee: {
      name: "홍길동"
    },
    reason: "<script>alert('xss')</script>"
  });

  assert.equal(rendered.includes("휴가 신청"), true);
  assert.equal(rendered.includes("홍길동"), true);
  assert.equal(rendered.includes("&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"), true);
});

test("renderHtmlTemplate returns empty string for missing keys", () => {
  const rendered = renderHtmlTemplate("<p>{{missing.value}}</p>", {});
  assert.equal(rendered, "<p></p>");
});
