/* Payload admin layout (route group (payload)). Equivalent of the Payload-generated
   file — renders its own <html> separately from the storefront ((frontend)). */
import type { ServerFunctionClient } from 'payload';
import config from '@payload-config';
import '@payloadcms/next/css';
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts';
import type React from 'react';
import { importMap } from './admin/importMap.js';
import './custom.scss';

// biome-ignore lint/complexity/useArrowFunction: mirrors the Payload-generated file ('use server' boundary).
const serverFunction: ServerFunctionClient = async function (args) {
  'use server';
  return handleServerFunctions({ ...args, config, importMap });
};

const Layout = ({ children }: { children: React.ReactNode }) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {children}
  </RootLayout>
);

export default Layout;
