<script setup>
import { marked } from 'marked';
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// Referencias a los scripts cargados para poder eliminarlos cuando se desmonte el componente
const loadedScripts = ref([]);

// Función para cargar dinámicamente un script
const loadScript = (src) => {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            loadedScripts.value.push(script);
            resolve(script);
            console.log(`Script cargado: ${src}`);
        };
        script.onerror = (error) => {
            console.error(`Error al cargar script ${src}:`, error);
            reject(error);
        };
        document.head.appendChild(script);
    });
};

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
    },
    {
        title: 'Gestión de Usuarios',
        children: [
            {
                title: 'Componentes y Servicios',
                children: [
                    { title: 'Componente ProfileSettings', path: 'components/ProfileSettings' },
                    { title: 'UsersService', path: 'services/UsersService' },
                    { title: 'Directiva vRole', path: 'directives/vRole' }
                ]
            },
            {
                title: 'Autenticación y Autorización',
                children: [
                    { title: 'Composable useAuth', path: 'composables/useAuth' },
                    { title: 'API de Autenticación', path: 'routes/auth' },
                    { title: 'API de Usuarios', path: 'routes/users' },
                    { title: 'DB Utils Usuarios', path: 'db/db_utilsUsers' }
                ]
            }
        ]
    }
];

// Variable para los diagramas pendientes
const diagrams = ref([]);

// Función para renderizar diagramas pendientes - adaptada para usar nomnoml como variable global
const renderPendingDiagrams = async () => {
    console.log(`Renderizando ${diagrams.value.length} diagramas pendientes...`);

    // Esperamos un momento para asegurar que el DOM se ha actualizado
    await nextTick();

    // Verificamos que nomnoml esté disponible globalmente
    if (typeof window.nomnoml === 'undefined') {
        console.error('La biblioteca nomnoml no está disponible globalmente');
        return;
    }

    console.log('Nomnoml detectado como variable global:', window.nomnoml);

    // Filtramos los diagramas para solo intentar renderizar los que tienen contenedores existentes
    const diagramsToRender = diagrams.value.filter((diagram) => {
        const container = document.getElementById(diagram.id);
        return container !== null;
    });

    console.log(`Encontrados ${diagramsToRender.length} contenedores de diagramas válidos`);

    if (typeof window.nomnoml.renderSvg === 'function') {
        console.log('Usando nomnoml.renderSvg para renderizar diagramas');

        diagramsToRender.forEach((diagram) => {
            try {
                const container = document.getElementById(diagram.id);
                console.log(`Renderizando diagrama ${diagram.id}`);

                // Generamos el SVG directamente
                const svgString = window.nomnoml.renderSvg(diagram.source);
                container.innerHTML = svgString;

                // NUEVO: Identificar y marcar las etiquetas de relaciones
                // Las etiquetas de relaciones son elementos text que están fuera de las cajas y normalmente cerca de paths
                const svg = container.querySelector('svg');
                if (svg) {
                    // Identificar primero qué textos son nombres de entidades
                    const entityNames = [];
                    const entityTexts = Array.from(diagram.source.matchAll(/\[(.*?)\]/g));
                    entityTexts.forEach((match) => {
                        if (match[1] && !match[1].startsWith('<')) {
                            entityNames.push(match[1].trim());
                        }
                    });

                    // Buscar todos los textos SVG
                    const texts = svg.querySelectorAll('text');
                    texts.forEach((text) => {
                        const content = text.textContent.trim();

                        // Verificar si es un nombre de entidad (no queremos marcar estos como etiquetas)
                        const isEntityName = entityNames.includes(content);

                        // Si no es un nombre de entidad y parece una etiqueta de relación
                        const isRelationshipLabel =
                            !isEntityName &&
                            (content.includes(':') ||
                                content.includes('a muchos') ||
                                content.includes('usa') ||
                                content.includes('asociado') ||
                                content.includes('pertenece') ||
                                content.match(/^\d+\.\.\d+$/) || // Para patrones como "1..*"
                                content.match(/^\d+\.\.\*$/)); // Para patrones como "0..*"

                        if (isRelationshipLabel) {
                            // Marcar este texto como etiqueta de relación
                            text.setAttribute('data-relation-label', 'true');
                        }
                    });
                } else {
                    console.error(`No se encontró el elemento SVG en el contenedor ${diagram.id}`);
                }

                console.log(`Diagrama ${diagram.id} renderizado correctamente`);
            } catch (error) {
                console.error(`Error al renderizar diagrama ${diagram.id}:`, error);
            }
        });

        // Limpiamos la lista de diagramas ya renderizados
        diagrams.value = diagrams.value.filter((d) => !diagramsToRender.some((dr) => dr.id === d.id));
    } else if (typeof window.nomnoml.draw === 'function') {
        console.log('Usando nomnoml.draw para renderizar diagramas');

        diagramsToRender.forEach((diagram) => {
            try {
                const container = document.getElementById(diagram.id);
                console.log(`Renderizando diagrama ${diagram.id}`);

                // Para la función draw necesitamos un canvas
                const canvas = document.createElement('canvas');
                canvas.width = container.clientWidth || 800;
                canvas.height = 500;
                canvas.style.width = '100%';
                canvas.style.height = 'auto';

                container.innerHTML = '';
                container.appendChild(canvas);

                // Utilizamos la función draw desde la variable global
                window.nomnoml.draw(canvas, diagram.source);

                console.log(`Diagrama ${diagram.id} renderizado correctamente`);
            } catch (error) {
                console.error(`Error al renderizar diagrama ${diagram.id}:`, error);
            }
        });

        // Limpiamos la lista de diagramas ya renderizados
        diagrams.value = diagrams.value.filter((d) => !diagramsToRender.some((dr) => dr.id === d.id));
    } else {
        console.error('No se encontró ninguna función de renderizado en nomnoml');
    }
};

// Configuración de marked para procesar bloques de código
const setupMarkedRenderer = () => {
    console.log('Configurando renderer de marked para nomnoml');
    const renderer = new marked.Renderer();
    const originalCodeRenderer = renderer.code.bind(renderer);

    renderer.code = (code, language) => {
        console.log('Procesando bloque de código:', { language, codeStart: code.substring(0, 50) });

        // Detectar si es un diagrama nomnoml por el lenguaje especificado
        if (language === 'nomnoml') {
            console.log('Detectado diagrama nomnoml');

            // Crear ID único para este diagrama
            const diagramId = `diagram-${Math.random().toString(36).substring(2)}`;
            console.log('ID generado para el diagrama:', diagramId);

            // Registrar el diagrama para renderizarlo después
            diagrams.value.push({
                id: diagramId,
                source: code
            });

            // Solo devolver el contenedor, la renderización se hará después
            return `<div class="er-diagram-container">
                <div id="${diagramId}" class="nomnoml-diagram">
                  <div class="diagram-loader">Cargando diagrama...</div>
                </div>
              </div>`;
        }

        // Para cualquier otro código, usar el renderizador original
        return originalCodeRenderer(code, language);
    };

    // Aplicar el renderizador personalizado
    marked.setOptions({ renderer });
};

// Configurar el renderizador de Markdown al inicio
setupMarkedRenderer();

// Función para cargar un documento Markdown
const loadDocument = async (path) => {
    console.log('Cargando documento:', path);
    isLoading.value = true;

    // Resetear los diagramas pendientes
    diagrams.value = [];

    try {
        const filePath = `/doc/${path}.md`;
        console.log('Ruta completa:', filePath);

        if (markdownFiles[filePath]) {
            console.log('Archivo encontrado, importando contenido');
            const content = await markdownFiles[filePath]();
            console.log('Contenido cargado, longitud:', content.length);

            // Convertir Markdown a HTML
            documentContent.value = marked(content);
            console.log('HTML generado, longitud:', documentContent.value.length);

            // Extraer título del documento
            const titleMatch = content.match(/^# (.+)$/m);
            if (titleMatch && titleMatch[1]) {
                documentTitle.value = titleMatch[1];
            } else {
                const pathParts = path.split('/');
                documentTitle.value = pathParts[pathParts.length - 1];
            }
            console.log('Título establecido:', documentTitle.value);

            currentPath.value = path;
            await nextTick();

            // Renderizar diagramas después de que el DOM se haya actualizado
            if (diagrams.value.length > 0) {
                console.log(`Se encontraron ${diagrams.value.length} diagramas para renderizar`);
                setTimeout(renderPendingDiagrams, 200);
            }
        } else {
            console.error(`Documento no encontrado: ${path}, ruta completa: ${filePath}`);
            documentContent.value = `<div class="text-red-500">Error: Documento no encontrado: ${path}</div>`;
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
            await loadDocument('index');
        }
    },
    { immediate: true }
);

// Resolver una ruta relativa desde una ruta base
const resolvePath = (base, relative) => {
    const baseParts = base.split('/').slice(0, -1);
    const relativeParts = relative.split('/');
    const resultParts = [...baseParts];

    for (const part of relativeParts) {
        if (part === '..') {
            resultParts.pop();
        } else if (part !== '.' && part !== '') {
            resultParts.push(part);
        }
    }

    return resultParts.join('/');
};

// Renderizar links dentro del documento navegables
const handleContentClick = (event) => {
    if (event.target.tagName === 'A') {
        const href = event.target.getAttribute('href');

        if (href && href.endsWith('.md')) {
            event.preventDefault();
            const hrefWithoutExt = href.replace(/\.md$/, '');
            const resolvedPath = resolvePath(currentPath.value, hrefWithoutExt);
            navigateToDoc(resolvedPath);
        }
    }
};

onMounted(async () => {
    console.log('Componente Tech-documentation montado');
    isLoading.value = true;

    try {
        // Cargar primero graphre (dependencia de nomnoml)
        await loadScript('https://unpkg.com/graphre/dist/graphre.js');
        // Luego cargar nomnoml
        await loadScript('https://unpkg.com/nomnoml/dist/nomnoml.js');

        console.log('Bibliotecas para renderizar diagramas cargadas correctamente');

        // Verificamos que se han cargado correctamente
        if (window.nomnoml) {
            console.log('Nomnoml disponible:', Object.keys(window.nomnoml));
        } else {
            console.error('Nomnoml no se ha cargado correctamente');
        }

        // Cargar el documento inicial
        const docPath = route.query.doc || 'index';
        await loadDocument(docPath);

        // Configurar evento para intentar renderizar cuando la ventana cambie de tamaño
        window.addEventListener('resize', () => {
            if (diagrams.value.length > 0) {
                console.log('Reintentando renderizar diagramas por cambio de tamaño');
                setTimeout(renderPendingDiagrams, 200);
            }
        });
    } catch (error) {
        console.error('Error al cargar las bibliotecas:', error);
        documentContent.value = `<div class="text-red-500">Error al cargar las bibliotecas necesarias para la documentación: ${error.message}</div>`;
    } finally {
        isLoading.value = false;
    }
});

// Eliminar los scripts cuando se desmonte el componente para evitar conflictos
onBeforeUnmount(() => {
    console.log('Limpiando scripts al desmontar Tech-documentation');
    // Eliminar los scripts cargados
    loadedScripts.value.forEach((script) => {
        if (script && script.parentNode) {
            script.parentNode.removeChild(script);
        }
    });
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

/* Estilos para el contenedor del diagrama ER */
.er-diagram-container {
    margin: 1.5rem 0;
    text-align: center;
    overflow-x: auto;
    background-color: #f8f8f8;
    padding: 1rem;
    border-radius: 5px;
}

.nomnoml-diagram {
    display: inline-block;
    min-height: 400px;
    width: 100%;
    position: relative;
}

.diagram-loader {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-style: italic;
    color: #666;
}

/* Ajuste para tema oscuro */
:root.app-dark .er-diagram-container,
.app-dark .er-diagram-container {
    background-color: #2d3748;
}

:root.app-dark .diagram-loader,
.app-dark .diagram-loader {
    color: #ddd;
}

/* Nuevo: Mantener color de flechas consistente en modo oscuro */
:root.app-dark .nomnoml-diagram svg line,
:root.app-dark .nomnoml-diagram svg path,
.app-dark .nomnoml-diagram svg line,
.app-dark .nomnoml-diagram svg path {
    stroke: #a8a8a8 !important;
}

/* Nuevo: Hacer que SOLO el texto de las etiquetas de relaciones sea de color específico en modo oscuro */
:root.app-dark .nomnoml-diagram svg text[data-relation-label='true'],
.app-dark .nomnoml-diagram svg text[data-relation-label='true'] {
    fill: #fde9e9 !important; /* Color turquesa para las etiquetas */
    stroke: none !important;
}
</style>
