import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import {
  AuthProvider,
  ThemeProvider,
  I18nProvider,
} from "@/components/providers";
import { ReduxProvider } from "@/store/ReduxProvider";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Al-Huda Public School and College Meithakheil",
  description: "Complete school management system for Al-Huda Public School and College Meithakheil",
  icons: {
    icon: [
      { url: "/SchoolLogo.png", type: "image/png" },
    ],
    shortcut: "/SchoolLogo.png",
    apple: "/SchoolLogo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <ReduxProvider>
            <ThemeProvider>
              <I18nProvider>
                {children}
                <Toaster
                  position="top-right"
                  expand={true}
                  richColors
                  toastOptions={{
                    duration: 4000,
                    style: {
                      fontFamily: "var(--font-inter)",
                      padding: "16px",
                      borderRadius: "12px",
                      fontSize: "14px",
                      boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
                    },
                    classNames: {
                      toast: "toast-custom",
                      title: "toast-title",
                      description: "toast-description",
                      success: "toast-success",
                      error: "toast-error",
                      warning: "toast-warning",
                      info: "toast-info",
                    },
                  }}
                />
              </I18nProvider>
            </ThemeProvider>
          </ReduxProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
