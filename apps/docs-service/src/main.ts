import { createDocsServiceServer } from "./server";

const port = Number(process.env.DOCS_SERVICE_PORT ?? 4300);
const server = createDocsServiceServer();

server.listen(port, () => {
  console.log(`[docs-service] listening on port ${port}`);
});
