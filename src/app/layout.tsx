import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Rodape } from "@/components/rodape";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://salario2026.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: {
    default: "Salarium Debitum — calculadora de salário atrasado",
    template: "%s | Salarium Debitum",
  },
  description:
    "Calcule juros, multa e correção sobre salário, férias, décimo terceiro e FGTS pagos fora do prazo. Aceita pagamento parcial e gera memorial de cálculo em PDF.",
  keywords: [
    "salário atrasado",
    "juros de mora trabalhista",
    "quinto dia útil",
    "atraso de férias",
    "décimo terceiro atrasado",
    "FGTS em atraso",
    "calculadora trabalhista",
  ],
  authors: [{ name: "Ary Ribeiro", url: "https://www.linkedin.com/in/aryribeiro" }],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: site,
    siteName: "Salarium Debitum",
    title: "Salarium Debitum — calculadora de salário atrasado",
    description:
      "Juros, multa e correção sobre salário, férias, décimo terceiro e FGTS pagos fora do prazo, com memorial em PDF.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1413" },
  ],
};

/** Aplica o tema salvo antes da primeira pintura, para não piscar. */
const TEMA_INICIAL = `(function(){try{var t=localStorage.getItem("sd:tema");if(t==="claro"||t==="escuro"){document.documentElement.setAttribute("data-tema",t)}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_INICIAL }} />
      </head>
      <body className="flex min-h-full flex-col antialiased">
        <div className="flex-1">{children}</div>
        <Rodape />
      </body>
    </html>
  );
}
