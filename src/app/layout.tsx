import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DayOne · First-day readiness",
  description: "Coordinate preparation, resolve handoffs, and review readiness before the first day.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
