import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // O pacote do PDF traz as métricas das fontes em JSON; deixar o Vite
    // transformá-lo evita a exigência de import attribute do Node.
    server: { deps: { inline: [/@cantoo\/pdf-lib/] } },
  },
});
