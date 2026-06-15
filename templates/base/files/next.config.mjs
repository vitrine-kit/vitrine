/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
};

// backend-payload перезаписывает этот файл (оборачивает в withPayload).
export default nextConfig;
