import "./globals.css";

export const metadata = {
  title: "Tambay sa Pasko — SMCT Christmas Party 2026",
  description: "SMCT presents Tambay sa Pasko Christmas Party 2026. Search your name and find your table!"
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d0d0d"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Permanent+Marker&family=Space+Grotesk:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
