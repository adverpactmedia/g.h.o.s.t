import type { Metadata } from "next";
import type { ReactNode } from "react";
import ghostLogo from "../../Ghogo.jpg";
import "./globals.css";

export const metadata: Metadata = {
  title: "G.H.O.S.T. | Your meetings leave. Their decisions don't.",
  description:
    "Turn recorded conversations into clear summaries, confirmed decisions, action items and follow-ups.",

  applicationName: "G.H.O.S.T.",

  keywords: [
    "meeting intelligence",
    "meeting summaries",
    "conversation intelligence",
    "meeting notes",
    "action items",
    "meeting follow-ups",
  ],

  icons: {
    icon: [
      {
        url: ghostLogo.src,
        type: "image/jpeg",
      },
    ],
    shortcut: ghostLogo.src,
    apple: ghostLogo.src,
  },

  openGraph: {
    title: "G.H.O.S.T. | Your meetings leave. Their decisions don't.",
    description:
      "Gather. Highlight. Organize. Summarize. Track. Turn conversations into clear next steps.",
    siteName: "G.H.O.S.T.",
    type: "website",
    images: [
      {
        url: ghostLogo.src,
        alt: "G.H.O.S.T. logo",
      },
    ],
  },

  twitter: {
    card: "summary",
    title: "G.H.O.S.T. | Your meetings leave. Their decisions don't.",
    description: "Your meetings leave. Their decisions don't.",
    images: [ghostLogo.src],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}