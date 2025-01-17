# vite-plugin-tanstack-router-sitemap

A Vite plugin that automatically generates a sitemap.xml from your TanStack Router routes.

## Installation

```bash
npm install --save-dev vite-plugin-tanstack-router-sitemap
```

## Usage

In your vite.config.ts:

```typescript
import { defineConfig } from "vite";
import sitemapPlugin from "vite-plugin-tanstack-router-sitemap";

export default defineConfig({
  plugins: [
    sitemapPlugin({
      hostname: "https://yourdomain.com",
      routes: {
        "/": {
          changefreq: "daily",
          priority: 1.0,
        },
      },
    }),
  ],
});
```
