// vite-sitemap-plugin.ts
interface SitemapOptions {
    hostname: string;
    routeTreePath?: string;
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
        .filter(route => route !== '__root__')
        .map(route => route === '/' ? route : route.replace(/\/$/, ''));
    } catch (e) {
      console.error('Error parsing route manifest:', e);
      return [];
    }
  }
  
  export function sitemapPlugin(options: SitemapOptions) {
    const {
      hostname,
      routeTreePath = 'app/routeTree.gen.ts',
      routes = {},
      defaultChangefreq = 'weekly',
      defaultPriority = 0.5
    } = options;
  
    return {
      name: 'vite-plugin-sitemap',
      apply: 'build',
      closeBundle: async () => {
        try {
          const possiblePaths = [
            routeTreePath,
            `src/${routeTreePath}`,
            process.cwd() + '/' + routeTreePath,
            process.cwd() + '/src/' + routeTreePath
          ];
  
          let routeTreeContent: string | null = null;
          let foundPath: string | null = null;
  
          const { promises: fsPromises } = await import('fs');
          const { resolve } = await import('path');
  
          for (const testPath of possiblePaths) {
            try {
              routeTreeContent = await fsPromises.readFile(testPath, 'utf-8');
              foundPath = testPath;
              break;
            } catch (e) {
              continue;
            }
          }
  
          if (!routeTreeContent || !foundPath) {
            throw new Error(
              `Could not find route tree file. Tried the following paths:\n${possiblePaths.join('\n')}`
            );
          }
  
          console.log(`Found route tree at: ${foundPath}`);
  
          const allRoutes = extractRoutesFromManifest(routeTreeContent);
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
          
          const publicDir = resolve(process.cwd(), 'public');
          
          try {
            await fsPromises.access(publicDir);
          } catch {
            await fsPromises.mkdir(publicDir, { recursive: true });
          }
  
          await fsPromises.writeFile(
            resolve(publicDir, 'sitemap.xml'),
            sitemapContent
          );
  
          console.log('✓ Sitemap generated successfully');
        } catch (error) {
          console.error('Error generating sitemap:', error);
        }
      },
    };
  }
  
  export default sitemapPlugin;