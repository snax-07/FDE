import type { Metadata } from "next";
import "./globals.css";
import {AppProviders} from "@/src/providers/app-providers";

export const metadata: Metadata = {
  title: "ForgeOps Control Plane",
  description: "Manage tenants, integrations, and AI operations.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body><AppProviders>{children}</AppProviders></body>
    </html>
  );
}
