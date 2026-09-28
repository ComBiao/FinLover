import type { NextConfig } from 'next';
const config: NextConfig = {
  serverExternalPackages: ['swagger-ui-dist'],
  outputFileTracingIncludes: { '/api/docs/assets/*': ['node_modules/swagger-ui-dist/swagger-ui.css', 'node_modules/swagger-ui-dist/swagger-ui-bundle.js', 'node_modules/swagger-ui-dist/absolute-path.js'] },
};
export default config;
