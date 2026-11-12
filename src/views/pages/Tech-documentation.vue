<script>
// Registro ÚNICO del renderer de marked, a nivel de módulo (U-24): antes se creaba en cada
// carga de documento y la segunda llamada a marked.setOptions lo sustituía por `undefined`,
// de modo que el visor nunca llegaba a dibujar los diagramas.
import { marked } from 'marked';

// El componente registra aquí, una sola vez, cómo crear el contenedor de cada diagrama.
let crearContenedorDiagrama = () => '';

function registrarContenedorDiagrama(crear) {
    crearContenedorDiagrama = crear;
}

const codeOriginal = marked.Renderer.prototype.code;
const renderer = new marked.Renderer();

renderer.code = function (code, infostring, escaped) {
    const lenguaje = String(infostring || '')
        .trim()
        .split(/\s+/)[0];

    if (lenguaje === 'nomnoml') {
        return crearContenedorDiagrama(code);
    }

    // Resto de bloques: se delega en el renderer original de marked, así el HTML es el mismo
    // que sin personalización (escapado de &, sin language-undefined ni line-numbers).
    return codeOriginal.call(this, code, infostring, escaped);
};

marked.setOptions({ renderer });
</script>

<script setup>
import nomnoml from 'nomnoml';
import { nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useLayout } from '@/layout/composables/layout';

// Apariencia general: al cambiar el tema se vuelve a pintar el diagrama (DC-56)
const { isDarkTheme } = useLayout();

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
                    { title: 'DB Utils Recibos', path: 'db/db_utilsBill' },
                    { title: 'Procedimiento de recibos del año', path: 'db/generar_recibos_anio' },
                    { title: 'DB Utils Ajustes', path: 'db/db_ajustes' },
                    { title: 'API de Ajustes', path: 'routes/ajustes' }
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
                    { title: 'AjustesService', path: 'services/AjustesService' },
                    { title: 'Componente Login', path: 'components/Login' },
                    { title: 'Directiva vRole', path: 'directives/vRole' }
                ]
            },
            {
                title: 'Autenticación y Autorización',
                children: [
                    { title: 'Composable useAuth', path: 'composables/useAuth' },
                    { title: 'Composable useZonaHoraria', path: 'composables/useZonaHoraria' },
                    { title: 'Composable useAjustesSesion', path: 'composables/useAjustesSesion' },
                    { title: 'Composable useTheme', path: 'composables/useTheme' },
                    { title: 'Composable useLayout', path: 'composables/useLayout' },
                    { title: 'API de Autenticación', path: 'routes/auth' },
                    { title: 'API de Usuarios', path: 'routes/users' },
                    { title: 'DB Utils Usuarios', path: 'db/db_utilsUsers' },
                    { title: 'Flujo de autenticación', path: 'auth/AuthenticationFlow' },
                    { title: 'Caducidad del token', path: 'auth/TokenExpiration' },
                    { title: 'Middleware de autenticación', path: 'middleware/auth' },
                    { title: 'Guardias de rutas', path: 'router/routeGuards' },
                    { title: 'Configuración de entorno', path: 'config/env' }
                ]
            }
        ]
    },
    {
        title: 'Ajustes, base de datos y mantenimiento',
        children: [
            {
                title: 'Base de datos y mantenimiento',
                children: [
                    { title: 'DbConfigService', path: 'services/DbConfigService' },
                    { title: 'MaintenanceDBService', path: 'services/MaintenanceDBService' },
                    { title: 'API de conexión', path: 'routes/conexionDB' },
                    { title: 'API de mantenimiento', path: 'routes/mantenimientoDB' },
                    { title: 'DB Utils Conexión', path: 'db/db_utilsConn' },
                    { title: 'DB Utils Mantenimiento', path: 'db/db_maintenance' },
                    { title: 'Utilidades de tiempo', path: 'utils/tiempo' },
                    { title: 'Utilidad apiError', path: 'utils/apiError' },
                    { title: 'Utilidad de fechas de formulario', path: 'utils/fechasFormulario' },
                    { title: 'Utilidad de CSV', path: 'utils/csv' },
                    { title: 'Utilidad de errores de negocio', path: 'utils/errorDeNegocio' },
                    { title: 'Catálogo de causas de error', path: 'utils/catalogoErrores' },
                    { title: 'Esquema de la base de datos', path: 'db/schema/index' }
                ]
            },
            {
                title: 'Otras pantallas y proyecto',
                children: [
                    { title: 'Calendario', path: 'components/Calendar' },
                    { title: 'Visor de documentación', path: 'components/Tech-documentation' },
                    { title: 'Páginas vacías de la plantilla', path: 'components/PaginasVacias' },
                    { title: 'Suite E2E (Playwright)', path: 'pruebas/e2e' },
                    { title: 'Entorno de pruebas del backend', path: 'pruebas/entorno-pruebas' },
                    { title: 'Estado del proyecto (entrada)', path: 'mantenimiento/estado-del-proyecto' },
                    { title: 'Estado: parte 1 de 3', path: 'mantenimiento/estado-del-proyecto_1de3' },
                    { title: 'Estado: parte 2 de 3', path: 'mantenimiento/estado-del-proyecto_2de3' },
                    { title: 'Estado: parte 3 de 3', path: 'mantenimiento/estado-del-proyecto_3de3' },
                    { title: 'Auditoría de documentación', path: 'mantenimiento/auditoria-documentacion' },
                    { title: 'Registro de hallazgos (entrada)', path: 'mantenimiento/registro-hallazgos' },
                    { title: 'Registro: parte 1 de 3', path: 'mantenimiento/registro-hallazgos_1de3' },
                    { title: 'Registro: parte 2 de 3', path: 'mantenimiento/registro-hallazgos_2de3' },
                    { title: 'Registro: parte 3 de 3', path: 'mantenimiento/registro-hallazgos_3de3' },
                    { title: 'Instrucción persistente (entrada)', path: 'mantenimiento/instruccion-persistente' },
                    { title: 'Instrucción: parte 1 de 4', path: 'mantenimiento/instruccion-persistente_1de4' },
                    { title: 'Instrucción: parte 2 de 4', path: 'mantenimiento/instruccion-persistente_2de4' },
                    { title: 'Instrucción: parte 3 de 4', path: 'mantenimiento/instruccion-persistente_3de4' },
                    { title: 'Instrucción: parte 4 de 4', path: 'mantenimiento/instruccion-persistente_4de4' },
                    { title: 'Informes de iteración (índice)', path: 'mantenimiento/informes_iteraciones/index' }
                ]
            }
        ]
    }
];

// Diagramas nomnoml pendientes de pintar. Se conservan las fuentes para poder volver a
// dibujarlos cuando cambia el tema (DC-56); la lista solo se vacía al cargar otro documento.
const diagrams = ref([]);

// nomnoml no tiene tema propio: en oscuro se antepone al bloque una cabecera con #fill y
// #stroke (el .md no se modifica) y se vuelve a pintar; en claro se usan sus colores por defecto.
const cabeceraTema = () => (isDarkTheme.value ? '#fill: #4a5568\n#stroke: #e5e7eb' : null);
const claveTema = () => (isDarkTheme.value ? 'oscuro' : 'claro');

const escaparHtml = (texto) => String(texto).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// nomnoml informa «Parse error at line N column M» contando desde el inicio del bloque. La
// cabecera de tema añade líneas al principio, así que se descuenta el desfase para que el
// número mostrado sea el mismo en los dos temas.
const mensajeDeError = (error, desfase) => {
    const mensaje = String(error?.message ?? error);
    if (!desfase) return mensaje;
    return mensaje.replace(/line (\d+)/, (coincidencia, numero) => `line ${Math.max(1, Number(numero) - desfase)}`);
};

// Pinta los diagramas que aún no lo están con el tema actual
const renderPendingDiagrams = async () => {
    await nextTick();

    if (typeof nomnoml?.renderSvg !== 'function') {
        console.error('documentacion - diagramas: nomnoml no expone renderSvg');
        return;
    }

    const tema = claveTema();
    const pendientes = diagrams.value.filter((diagrama) => diagrama.pintadoCon !== tema);
    if (!pendientes.length) return;

    const cabecera = cabeceraTema();
    const desfase = cabecera ? cabecera.split('\n').length : 0;

    pendientes.forEach((diagrama) => {
        const container = document.getElementById(diagrama.id);
        if (!container) return; // todavía sin DOM: no se marca y lo reintenta el watch de isLoading

        try {
            const fuente = cabecera ? `${cabecera}\n${diagrama.source}` : diagrama.source;
            container.innerHTML = nomnoml.renderSvg(fuente);
            diagrama.pintadoCon = tema;
        } catch (error) {
            const mensaje = mensajeDeError(error, desfase);
            container.innerHTML = `<div class="diagram-error">No se ha podido dibujar el diagrama nomnoml: ${escaparHtml(mensaje)}</div>`;
            console.error('documentacion - renderizar diagrama: ', diagrama.id, mensaje);
            diagrama.pintadoCon = tema; // evita reintentos en bucle con la misma fuente
        }
    });
};

// El renderer de marked (registrado una sola vez en el módulo) pide aquí el contenedor
registrarContenedorDiagrama((code) => {
    const diagramId = `diagram-${Math.random().toString(36).substring(2)}`;
    diagrams.value.push({ id: diagramId, source: code, pintadoCon: null });
    console.log('documentacion - diagrama registrado: ', diagramId);

    return `<div class="er-diagram-container">
                <div id="${diagramId}" class="nomnoml-diagram">
                  <div class="diagram-loader">Cargando diagrama...</div>
                </div>
              </div>`;
});

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

            // Convertir Markdown a HTML con el renderer registrado al cargar el módulo
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

// El contenido está oculto con v-if="!isLoading": los diagramas se pintan al terminar la carga
watch(
    isLoading,
    async (cargando) => {
        if (cargando) return;
        await nextTick();
        await renderPendingDiagrams();
    },
    { flush: 'post' }
);

// Cambio de tema claro/oscuro: se vuelve a dibujar el diagrama (no se aplica CSS sobre el SVG)
watch(isDarkTheme, () => renderPendingDiagrams());

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
    // El watch de route.query.doc (immediate) ya carga el documento; aquí solo se completa el
    // pintado cuando el documento se resolvió antes de montar el componente.
    await nextTick();
    await renderPendingDiagrams();
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

/* Estilos para el contenedor del diagrama nomnoml */
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

/* El SVG trae width/height fijos y viewBox: se adapta al ancho sin volver a pintarlo */
.nomnoml-diagram svg {
    max-width: 100%;
    height: auto;
}

.diagram-loader {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-style: italic;
    color: #666;
}

/* Aviso legible cuando el bloque nomnoml no compila */
.diagram-error {
    color: #b91c1c;
    font-style: italic;
    text-align: left;
}

/* Tema oscuro: el color del diagrama lo fija la cabecera #fill/#stroke del render */
:root.app-dark .er-diagram-container,
.app-dark .er-diagram-container {
    background-color: #2d3748;
}

:root.app-dark .diagram-loader,
.app-dark .diagram-loader {
    color: #ddd;
}

:root.app-dark .diagram-error,
.app-dark .diagram-error {
    color: #fca5a5;
}
</style>
