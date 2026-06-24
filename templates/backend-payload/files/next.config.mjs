// backend-payload: wrap the Next config in withPayload (mounts the Payload admin and
// API into Next). output: 'standalone' — for the Docker image (VPS).
import { withPayload } from '@payloadcms/next/withPayload';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
};

export default withPayload(nextConfig);
