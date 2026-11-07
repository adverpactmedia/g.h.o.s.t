import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
export const metadata: Metadata = {
  title: "G.H.O.S.T. — Your meetings leave. Their decisions don't.",
  description: "A meeting companion that turns conversations into decisions, action items and follow-ups in your voice.",
};
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
