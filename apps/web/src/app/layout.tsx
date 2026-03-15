import type { Metadata } from "next";
import type { ReactNode } from "react";

import { UiShellProvider } from "../components/ui-shell-provider";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Urimodu ERP",
  description: "Open-source self-hosted Korean ERP/work platform"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <UiShellProvider>{children}</UiShellProvider>
      </body>
    </html>
  );
}
