import { defineConfig } from "vite";

export default defineConfig({
  base: "/cafestjarnan/",
  server: {
    proxy: {
      "/cafestjarnan/api": {
        target: "http://localhost:3000",
        rewrite: (p) => p.replace(/^\/cafestjarnan/, ""),
      },
    },
  },
});
