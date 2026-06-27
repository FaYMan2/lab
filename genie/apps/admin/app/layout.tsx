import type { ReactNode } from "react";

export const metadata = {
  title: "Genie · Admin",
  description: "Model routing and run history for Genie.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          maxWidth: 880,
          margin: "0 auto",
          padding: "2rem 1rem",
          color: "#111",
        }}
      >
        <h1>🧞 Genie Admin</h1>
        {children}
      </body>
    </html>
  );
}
