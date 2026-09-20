import type { Metadata } from "next";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-600.css";
import "@darsh/design/tokens.css";
import "@darsh/design/base.css";
import "@darsh/design/components.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "permfuzz: see what your agent can actually touch",
  description:
    "Static permission analysis for AI agent tool grants. Finds the lethal trifecta, unbounded shell, wildcard scopes and uncapped spend. Runs entirely in your browser.",
  metadataBase: new URL("https://permfuzz.darsh.top"),
  openGraph: {
    title: "permfuzz",
    description:
      "Static permission analysis for AI agent tool grants. Runs entirely in your browser.",
    url: "https://permfuzz.darsh.top",
    siteName: "Darshan Ahirrao",
    type: "website",
  },
  icons: {
    icon: "/icon.svg",
  },
};

const themeScript = `(function(){try{var s=localStorage.getItem("permfuzz-theme");var d=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.theme=s||(d?"dark":"light");}catch(e){document.documentElement.dataset.theme="light";}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
