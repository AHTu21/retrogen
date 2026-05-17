import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    /** CHANGELOG в корне репозитория импортируется как `?raw` — разрешаем родительскую папку и следим за файлом (обновление «О программе» без ручных копий). */
    fs: {
      allow: [path.resolve(__dirname, "..")],
    },
    /** Все интерфейсы — страница открывается с других машин по http://<ваш-IP>:5173/ при открытом порте в файрволе и пробросе на роутере. */
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    /** Если заходите по внешнему IP и «ломается» hot reload — задайте в `client/.env`: VITE_DEV_PUBLIC_HOST и при необходимости VITE_DEV_PUBLIC_PORT. */
    ...(process.env.VITE_DEV_PUBLIC_HOST
      ? {
          hmr: {
            host: process.env.VITE_DEV_PUBLIC_HOST,
            port: Number(process.env.VITE_DEV_PUBLIC_PORT ?? 5173),
          },
        }
      : {}),
    proxy: {
      "/api": { target: "http://127.0.0.1:3000", changeOrigin: true },
      "/socket.io": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
        ws: true,
        /** Иначе long-poll обрывается по таймауту прокси → лавина коротких XHR. */
        timeout: 0,
        proxyTimeout: 0,
      },
    },
  },
});
