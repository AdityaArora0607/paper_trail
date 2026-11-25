import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/components/ui";

export const metadata: Metadata = {
  title: "PaperTrail",
  description: "Research navigation: citation graphs, concept lineage, reading paths",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <AuthProvider>
            <Nav />
            <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
