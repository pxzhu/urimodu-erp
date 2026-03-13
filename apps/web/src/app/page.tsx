import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      <h1>Korean Self-Hosted ERP</h1>
      <p>
        Public open-source bootstrap is ready. This workspace uses pnpm + Turborepo and a
        modular-monolith API foundation.
      </p>
      <ul>
        <li>Web app: Next.js</li>
        <li>Core API: NestJS + Swagger</li>
        <li>Worker: Redis queue-ready process</li>
        <li>Storage stack: PostgreSQL + Redis + MinIO</li>
      </ul>
      <p>
        Health endpoint: <code>/health</code>
      </p>
      <p>
        <Link href="/login">Open login page</Link>
      </p>
      <p>
        After login: <Link href="/files">Files</Link> · <Link href="/documents">Documents</Link> ·{" "}
        <Link href="/approvals">Approvals</Link>
      </p>
    </main>
  );
}
