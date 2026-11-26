// Configuração do Vite (ferramenta que roda e empacota o site)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
