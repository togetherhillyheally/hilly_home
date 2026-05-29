import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hilly Heally",
  description: "나만의 지도를 만들고, 함께 움직이는 경험을 만드세요.",
  generator: "hillyheally.com",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="icon"
          href="/images/favicon/favicon.ico"
          type="image/x-icon"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
