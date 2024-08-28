/** @type {import('next').NextConfig} */

import withLess from 'next-with-less';

const nextConfig = {
  reactStrictMode: true,
};

const withLessConfig = withLess(nextConfig);

export default withLessConfig;
