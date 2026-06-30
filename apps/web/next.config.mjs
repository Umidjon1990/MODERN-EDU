// Railway'da server rejimi (next start). Statik eksport faqat GitHub Pages uchun.
const isPages = process.env.GITHUB_PAGES === 'true';
const repo = 'MODERN-EDU';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@modern-edu/contracts', '@modern-edu/sdk'],
  ...(isPages
    ? {
        output: 'export',
        images: { unoptimized: true },
        trailingSlash: true,
        basePath: `/${repo}`,
        assetPrefix: `/${repo}/`,
      }
    : {}),
};

export default nextConfig;
