export const metadata = {
  title: "Firecrawl MCP Server",
  description: "Firecrawl MCP Server for Claude",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
