import fs from 'fs';
import { fileURLToPath, URL } from 'node:url';

import { PrimeVueResolver } from '@primevue/auto-import-resolver';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';
import vueDevTools from 'vite-plugin-vue-devtools';
import Inspector from 'vite-plugin-vue-inspector';

// https://vitejs.dev/config/
export default defineConfig({
    optimizeDeps: {
        noDiscovery: true
    },
    plugins: [
        vue(),
        vueDevTools({
            launchEditor: 'code'
        }),
        Inspector(),
        Components({
            resolvers: [PrimeVueResolver()]
        }),
        {
            name: 'vite-plugin-raw-loader',
            transform(code, id) {
                if (id.endsWith('.md?raw')) {
                    const filePath = id.slice(0, -4); // Quitar '?raw'
                    const fileContent = fs.readFileSync(filePath, 'utf-8');
                    return `export default ${JSON.stringify(fileContent)};`;
                }
            }
        }
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    assetsInclude: ['**/*.md'], // Incluir archivos MD como recursos
    server: {
        fs: {
            // Permitir servir archivos desde fuera del directorio raíz
            allow: ['..', '/workspaces/timon/doc'] // Explícitamente permitir la carpeta doc
        }
    }
});
