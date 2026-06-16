/* Разметка админки Payload (route group (payload)). Эквивалент сгенерированного
   Payload файла — рендерит свой <html> отдельно от витрины ((frontend)). */
import type { ServerFunctionClient } from 'payload';
import config from '@payload-config';
import '@payloadcms/next/css';
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts';
import type React from 'react';
import { importMap } from './admin/importMap.js';
import './custom.scss';

// biome-ignore lint/complexity/useArrowFunction: повторяет сгенерированный Payload файл (граница 'use server').
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
