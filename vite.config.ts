import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], build: {chunkSizeWarningLimit: 800, rollupOptions: {output: {manualChunks: {three: ['three'], renderer: ['@react-three/fiber','@react-three/drei']}}}}, server: {host: '0.0.0.0', allowedHosts: true} });
