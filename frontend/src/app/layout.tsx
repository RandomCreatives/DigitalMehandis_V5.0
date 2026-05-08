import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EthioQS — Ethiopian Quantity Surveying Tool",
  description: "Free, open-source quantity surveying tool for Ethiopian construction professionals",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
