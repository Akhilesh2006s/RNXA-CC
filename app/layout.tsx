import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { themeInitScript } from "@/features/theme/theme-init-script";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { AppToaster } from "@/providers/AppToaster";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark antialiased ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-surface font-sans text-ink" suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
          <AppToaster />
        </QueryProvider>
      </body>
    </html>
  );
}
