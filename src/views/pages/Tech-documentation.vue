<script setup>
import { marked } from 'marked';
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// Estado para los documentos y la navegación
const documentContent = ref('');
const documentTitle = ref('Documentación Técnica');
const isLoading = ref(false);
const currentPath = ref('index');
const route = useRoute();
const router = useRouter();

// Pre-importar todos los archivos Markdown disponibles
const markdownFiles = import.meta.glob('/doc/**/*.md', { query: '?raw', import: 'default' });

// Estructura de la documentación para la navegación
const docNavigation = [
    {
        title: 'Sistemas Financieros',
        path: 'index',
        children: [
            {
                title: 'Sistema de Recibos',
                children: [
                    { title: 'Componente Recibos', path: 'components/ListBills' },
                    { title: 'BillService', path: 'services/BillService' },
                    { title: 'API de Recibos', path: 'routes/recibos' },
                    { title: 'DB Utils Recibos', path: 'db/db_utilsBill' }
                ]
            },
            {
                title: 'Sistema de Anticipos',
                children: [
                    { title: 'Componente Advances', path: 'components/Advances' },
                    { title: 'AdvService', path: 'services/AdvService' },
                    { title: 'API de Anticipos', path: 'routes/anticipos' },
                    { title: 'DB Utils Anticipos', path: 'db/db_utilsAdv' }
                ]
            },
            {
                title: 'Sistema de Ahorros',
                children: [
                    { title: 'Componente Savings', path: 'components/Savings' },
                    { title: 'SavService', path: 'services/SavService' },
                    { title: 'API de Ahorros', path: 'routes/ahorros' },
                    { title: 'DB Utils Ahorros', path: 'db/db_utilsSav' }
                ]
            },
            {
                title: 'Sistema de Categorías',
                children: [
                    { title: 'Componente Categories', path: 'components/Categories' },
                    { title: 'CatsService', path: 'services/CatsService' },
                    { title: 'API de Categorías', path: 'routes/categorias' },
                    { title: 'DB Utils Categorías', path: 'db/db_utilsCats' }
                ]
            },
            {
                title: 'Sistema de Cuentas',
                children: [
                    { title: 'Componente Accounts', path: 'components/Accounts' },
                    { title: 'AccService', path: 'services/AccService' },
                    { title: 'API de Cuentas', path: 'routes/cuentas' },
                    { title: 'DB Utils Cuentas', path: 'db/db_utilsAcc' }
                ]
            }
        ]
    }
];

// Función para cargar un documento Markdown
const loadDocument = async (path) => {
    isLoading.value = true;
    try {
        // Construir la ruta absoluta al archivo
        const filePath = `/doc/${path}.md`;

        if (markdownFiles[filePath]) {
            // Importar el archivo si existe en la colección pre-importada
            const content = await markdownFiles[filePath]();
            documentContent.value = marked(content);

            // Extraer título del documento para mostrar en la cabecera
            const titleMatch = content.match(/^# (.+)$/m);
            if (titleMatch && titleMatch[1]) {
                documentTitle.value = titleMatch[1];
            } else {
                // Usar la última parte de la ruta como título
                const pathParts = path.split('/');
                documentTitle.value = pathParts[pathParts.length - 1];
            }

            currentPath.value = path;
        } else {
            // Manejar el caso en que el archivo no existe
            documentContent.value = `<div class="text-red-500">Error: Documento no encontrado: ${path}</div>`;
            console.error(`Documento no encontrado: ${path}, ruta completa: ${filePath}`);
            console.log('Archivos disponibles:', Object.keys(markdownFiles));
        }
    } catch (error) {
        console.error('Error al cargar el documento:', error);
        documentContent.value = `<div class="text-red-500">Error al cargar el documento: ${error.message}</div>`;
    } finally {
        isLoading.value = false;
    }
};

// Navegar a un documento específico
const navigateToDoc = (path) => {
    if (path !== currentPath.value) {
        router.push({ query: { doc: path } });
    }
};

// Vigilar cambios en la ruta para cargar el documento correspondiente
watch(
    () => route.query.doc,
    async (newDocPath) => {
        if (newDocPath) {
            await loadDocument(newDocPath);
        } else {
            // Si no hay documento especificado, cargar el índice
            await loadDocument('index');
        }
    },
    { immediate: true }
);

// Resolver una ruta relativa desde una ruta base
const resolvePath = (base, relative) => {
    // Dividir la ruta base en segmentos (sin el archivo)
    const baseParts = base.split('/').slice(0, -1);

    // Dividir la ruta relativa en segmentos
    const relativeParts = relative.split('/');

    // Procesar cada segmento de la ruta relativa
    const resultParts = [...baseParts];

    for (const part of relativeParts) {
        if (part === '..') {
            // Subir un nivel
            resultParts.pop();
        } else if (part !== '.' && part !== '') {
            // Añadir segmento (ignorar '.' y segmentos vacíos)
            resultParts.push(part);
        }
    }

    // Unir los segmentos en una ruta
    return resultParts.join('/');
};

// Renderizar links dentro del documento navegables
const handleContentClick = (event) => {
    // Verificar si el clic fue en un enlace
    if (event.target.tagName === 'A') {
        const href = event.target.getAttribute('href');

        // Verificar si es un enlace interno a otro documento (con .md)
        if (href && href.endsWith('.md')) {
            event.preventDefault();

            // Eliminar la extensión .md
            const hrefWithoutExt = href.replace(/\.md$/, '');

            // Resolver la ruta relativa a partir del documento actual
            const resolvedPath = resolvePath(currentPath.value, hrefWithoutExt);

            // Navegar al documento resuelto
            navigateToDoc(resolvedPath);
        }
    }
};

onMounted(async () => {
    // Cargar el documento inicial basado en los parámetros de la URL
    const docPath = route.query.doc || 'index';
    await loadDocument(docPath);
});

// Función recursiva para renderizar elementos de navegación
const renderNavItem = (item) => {
    if (item.children) {
        return `
            <div class="mb-2">
                <div class="font-semibold text-lg mb-1">${item.title}</div>
                <div class="pl-4">
                    ${item.children.map(renderNavItem).join('')}
                </div>
            </div>
        `;
    } else {
        const isActive = item.path === currentPath.value;
        return `
            <div class="mb-1">
                <a href="#" 
                   class="text-blue-600 hover:underline ${isActive ? 'font-bold' : ''}"
                   data-path="${item.path}"
                   onclick="event.preventDefault(); document.dispatchEvent(new CustomEvent('navigate-doc', { detail: '${item.path}' }))">
                    ${item.title}
                </a>
            </div>
        `;
    }
};

// Escuchar evento de navegación
document.addEventListener('navigate-doc', (event) => {
    navigateToDoc(event.detail);
});
</script>

<template>
    <div class="grid grid-cols-12 gap-4">
        <div class="col-span-3">
            <div class="card h-full">
                <div class="font-semibold text-xl mb-4">Documentación</div>
                <div v-for="section in docNavigation" :key="section.title" class="mb-4">
                    <div v-if="section.path" class="font-semibold text-lg mb-2">
                        <a href="#" :class="['text-primary hover:underline', { 'font-bold': section.path === currentPath }]" @click.prevent="navigateToDoc(section.path)">
                            {{ section.title }}
                        </a>
                    </div>
                    <div v-else class="font-semibold text-lg mb-2">{{ section.title }}</div>

                    <div v-if="section.children" class="pl-4">
                        <div v-for="group in section.children" :key="group.title" class="mb-3">
                            <div class="font-medium text-base mb-1">{{ group.title }}</div>
                            <div v-if="group.children" class="pl-3">
                                <div v-for="doc in group.children" :key="doc.path" class="mb-1">
                                    <a href="#" :class="['text-blue-600 hover:underline', { 'font-bold': doc.path === currentPath }]" @click.prevent="navigateToDoc(doc.path)">
                                        {{ doc.title }}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="col-span-9">
            <div class="card">
                <div class="flex justify-between items-center mb-4">
                    <!--
                    <div class="font-semibold text-2xl">{{ documentTitle }}</div>
-->
                    <div v-if="isLoading" class="text-gray-500">Cargando...</div>
                </div>
                <div v-if="!isLoading" class="documentation-content" v-html="documentContent" @click="handleContentClick"></div>
            </div>
        </div>
    </div>
</template>

<style>
.documentation-content {
    font-size: 1.1rem;
    line-height: 1.6;
}

.documentation-content h1 {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: var(--primary-color);
}

.documentation-content h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
    color: #d45959;
}

.documentation-content h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-top: 1.25rem;
    margin-bottom: 0.5rem;
}

.documentation-content p {
    margin-bottom: 1rem;
}

.documentation-content ul,
.documentation-content ol {
    margin-bottom: 1rem;
    padding-left: 3.5rem;
}

.documentation-content ul {
    list-style-type: disc;
}

.documentation-content ol {
    list-style-type: decimal;
}

.documentation-content li {
    margin-bottom: 0.25rem;
}

.documentation-content table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1rem;
}

.documentation-content th,
.documentation-content td {
    border: 1px solid #ddd;
    padding: 8px 12px;
    text-align: left;
}

.documentation-content th {
    background-color: #f2f2f2;
    font-weight: bold;
}

/* Regla específica para el tema oscuro */
:root.app-dark .documentation-content th,
.app-dark .documentation-content th {
    color: #080808;
}

.documentation-content code {
    font-family: monospace;
    background-color: #f5f5f5;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-size: 0.9em;
}

/* Regla específica para el tema oscuro - solo para código inline */
:root.app-dark .documentation-content code:not(pre code),
.app-dark .documentation-content code:not(pre code) {
    background-color: var(--primary-color);
    color: #080808;
}

.documentation-content pre {
    background-color: #f5f5f5;
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
    margin-bottom: 1rem;
}

/* Regla específica para el tema oscuro - fondos de bloques de código */
:root.app-dark .documentation-content pre,
.app-dark .documentation-content pre {
    background-color: #dfdfdf;
}

.documentation-content pre code {
    background-color: transparent;
    padding: 0;
    border-radius: 0;
}

/* Mantiene el código dentro de bloques sin fondo adicional */
:root.app-dark .documentation-content pre code,
.app-dark .documentation-content pre code {
    background-color: transparent;
    color: #000dc4;
}

.documentation-content blockquote {
    border-left: 4px solid #ddd;
    padding-left: 1rem;
    color: #666;
    margin-bottom: 1rem;
}

.documentation-content a {
    color: #3490dc;
    text-decoration: none;
}

.documentation-content a:hover {
    text-decoration: underline;
}
</style>
