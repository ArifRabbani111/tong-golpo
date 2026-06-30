import "./globals.css";

export const metadata = {
  title: "MatchTalk — Anonymous event chat",
  description: "Drop your take. No login, no names, just the game.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
