import "./globals.css";
import { themeInitScript } from "@/features/theme/theme-init-script";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { AppToaster } from "@/providers/AppToaster";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-surface text-ink" suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
          <AppToaster />
        </QueryProvider>
      </body>
    </html>
  );
}
