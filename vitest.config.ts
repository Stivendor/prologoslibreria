import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Config propia de Vitest: Vite la prioriza sobre vite.config.ts, así que el
// build de producción no se ve afectado por la sección `test`.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    clearMocks: true,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
