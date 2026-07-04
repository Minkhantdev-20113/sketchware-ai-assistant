import type { Metadata } from "next";

import { ThemeProvider } from "@/components/theme-provider";
import { SettingsApplier } from "@/components/settings/settings-applier";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sketchware AI Assistant",
  description:
    "A professional AI chat assistant tailored for Sketchware Pro Android developers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SettingsApplier />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
