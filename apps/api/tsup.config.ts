import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  clean: true,
  dts: false,
  format: ['esm'],
  noExternal: ['@homexbd/shared'],
  outDir: 'dist',
  platform: 'node',
  sourcemap: true,
  target: 'node22',
});
