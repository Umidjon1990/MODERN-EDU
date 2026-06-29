// GitHub Pages uchun statik eksport. Pages build'da GITHUB_PAGES=true beriladi,
// shunda repo nomi basePath sifatida qo'shiladi (https://<user>.github.io/modern-edu/).
const isPages = process.env.GITHUB_PAGES === 'true';
const repo = 'modern-edu';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@modern-edu/contracts'],
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  basePath: isPages ? `/${repo}` : '',
  assetPrefix: isPages ? `/${repo}/` : '',
};

export default nextConfig;
