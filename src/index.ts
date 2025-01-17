import { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

interface SitemapOptions {
  hostname: string;
  routes?: {
    [key: string]: {
      changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
      priority?: number;
      lastmod?: string;
    };
  };
  defaultChangefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  defaultPriority?: number;
}

function extractRoutesFromManifest(content: string): string[] {
  const manifestMatch = content.match(/ROUTE_MANIFEST_START([\s\S]*?)ROUTE_MANIFEST_END/);
  if (!manifestMatch) return [];

  try {
    const manifest = JSON.parse(manifestMatch[1]);
    return Object.keys(manifest.routes)
      .filter(route => route !== '__root__') // Filter out root route
      .map(route => route === '/' ? route : route.replace(/\/$/, '')); // Remove trailing slashes except for root
  } catch (e) {
    console.error('Error parsing route manifest:', e);
    return [];
  }
}

export default function sitemapPlugin(options: SitemapOptions): Plugin {
  const {
    hostname,
    routes = {},
    defaultChangefreq = 'weekly',
    defaultPriority = 0.5
  } = options;

  return {
    name: 'vite-plugin-sitemap',
    apply: 'build',
    closeBundle: async () => {
      try {
        // Read the route tree file
        const routeTreeContent = await fs.promises.readFile(
          path.resolve(process.cwd(), 'app/routeTree.gen.ts'),
          'utf-8'
        );

        // Extract routes from manifest
        const allRoutes = extractRoutesFromManifest(routeTreeContent);

        // Generate sitemap XML
        const today = new Date().toISOString().split('T')[0];
        
        const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes
  .map(route => {
    const routeConfig = routes[route] || {};
    return `  <url>
    <loc>${hostname}${route}</loc>
    <lastmod>${routeConfig.lastmod || today}</lastmod>
    <changefreq>${routeConfig.changefreq || defaultChangefreq}</changefreq>
    <priority>${routeConfig.priority || defaultPriority}</priority>
  </url>`;
  })
  .join('\n')}
</urlset>`;

        // Ensure public directory exists
        const publicDir = path.resolve(process.cwd(), 'public');
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }

        // Write sitemap
        await fs.promises.writeFile(
          path.resolve(publicDir, 'sitemap.xml'),
          sitemapContent
        );

        console.log('✓ Sitemap generated successfully');
      } catch (error) {
        console.error('Error generating sitemap:', error);
      }
    },
  };
}