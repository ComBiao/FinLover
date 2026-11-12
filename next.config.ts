import type { NextConfig } from 'next';
const config: NextConfig = {
  // The dev-tools badge covers the phone BottomNav "More" button and blocks e2e clicks.
  devIndicators: false,
  serverExternalPackages: ['swagger-ui-dist'],
  outputFileTracingIncludes: { '/api/docs/assets/*': ['node_modules/swagger-ui-dist/swagger-ui.css', 'node_modules/swagger-ui-dist/swagger-ui-bundle.js', 'node_modules/swagger-ui-dist/absolute-path.js'] },
};
export default config;
