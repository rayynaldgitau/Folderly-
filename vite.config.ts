import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Vite configuration for Tauri.
 *
 * - Disables host check (Tauri serves on a custom localhost).
 * - Clears the screen so Tauri's own output isn't swamped.
 * - Sets a static port so `tauri.conf.json` devUrl stays stable.
 */
export default defineConfig(async () => ({
  plugins: [react()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
