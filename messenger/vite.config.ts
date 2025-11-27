import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path, { resolve } from "path";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'chat-window': resolve(__dirname, 'chat-window.html'),
        'add-contact': resolve(__dirname, 'add-contact.html'),
        'options': resolve(__dirname, 'options.html'),
        'profile-picture-upload': resolve(__dirname, 'profile-picture-upload.html'),
        'remove-contact': resolve(__dirname, 'remove-contact.html'),
        'ringing-window': resolve(__dirname, 'ringing-window.html'),
        'add-group': resolve(__dirname, 'add-group.html'),
        'alert-dialog': resolve(__dirname, 'alert-dialog.html'),
        'add-to-group': resolve(__dirname, 'add-to-group.html'),
        'notification': resolve(__dirname, 'notification.html'),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/components": path.resolve(__dirname, "./src/components"),
      "@/lib": path.resolve(__dirname, "./src/lib"),
      "@/types": path.resolve(__dirname, "./src/types"),
      "@/styles": path.resolve(__dirname, "./src/styles"),
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
        protocol: "ws",
        host,
        port: 1421,
      }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
