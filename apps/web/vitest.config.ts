import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/test-setup.ts"],
    silent: "passed-only",
    // La primera prueba de cada fichero paga la transformacion del modulo, que
    // en este repositorio (WSL, ficheros en disco de Windows) supera los 5 s.
    testTimeout: 30000,
    hookTimeout: 30000,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true
  }
});
