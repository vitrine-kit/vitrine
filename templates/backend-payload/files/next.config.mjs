// backend-payload: оборачиваем Next-конфиг в withPayload (монтирует админку и
// API Payload в Next). output: 'standalone' — для Docker-образа (VPS).
import { withPayload } from '@payloadcms/next/withPayload';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
};

export default withPayload(nextConfig);
