import { CONFIG, showAlert } from '../../Core/core.js';
import { disableBodyScroll, enableBodyScroll, confirm, confirm as modalConfirm } from '../../UI/ui.js';

/**
 * Módulo de gestión de GitHub
 * Maneja la integración con la API de GitHub para guardar y cargar datos
 */

// Constantes de configuración
const GITHUB_CONFIG = CONFIG.GITHUB;

export class GitHubManager {
    constructor() {
        this.token = localStorage.getItem('llave_acceso') || null;
        this.apiBase = 'https://api.github.com';
    }

    /**
     * Valida que la configuración necesaria esté presente
     */
    isConfigured() {
        return this.token !== null && this.token !== '';
    }

    /**
     * Obtiene la configuración actual
     */
    getConfig() {
        return {
            token: this.token ? '***' : null,
            repo: GITHUB_CONFIG.REPO,
            filePath: GITHUB_CONFIG.FILE_PATH
        };
    }

    /**
     * Guarda el token de GitHub
     */
    saveToken(token) {
        this.token = token;
        localStorage.setItem('llave_acceso', token);
        return true;
    }

    /**
     * Limpia el token de GitHub
     */
    clearToken() {
        this.token = null;
        localStorage.removeItem('llave_acceso');
    }

    /**
     * Prueba la conexión con GitHub
     */
    async testConnection() {
        if (!this.isConfigured()) {
            throw new Error('Configuración incompleta. Por favor, configura tu llave de acceso.');
        }

        try {
            const response = await fetch(`${this.apiBase}/repos/${GITHUB_CONFIG.REPO}`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Repositorio no encontrado. Verifica el nombre.');
                } else if (response.status === 401) {
                    throw new Error('Lave de acceso inválido o expirado.');
                }
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return {
                success: true,
                repoName: data.name,
                repoUrl: data.html_url,
                isPrivate: data.private
            };
        } catch (error) {
            throw new Error(`Error de conexión: ${error.message}`);
        }
    }

    /**
     * Obtiene el contenido actual del archivo desde GitHub
     */
    async getFileContent() {
        if (!this.isConfigured()) {
            throw new Error('Configuración incompleta.');
        }

        try {
            const response = await fetch(
                `${this.apiBase}/repos/${GITHUB_CONFIG.REPO}/contents/${GITHUB_CONFIG.FILE_PATH}`,
                {
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (!response.ok) {
                if (response.status === 404) {
                    return null; // Archivo no existe
                }
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            // Decodificar base64 preservando UTF-8
            const binaryString = atob(data.content);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const decoder = new TextDecoder('utf-8');
            const content = decoder.decode(bytes);
            
            return {
                content: JSON.parse(content),
                sha: data.sha
            };
        } catch (error) {
            throw new Error(`Error al obtener archivo: ${error.message}`);
        }
    }

    /**
     * Guarda los pedidos en GitHub
     * @param {Array} pedidos - Array de pedidos a guardar
     * @param {String} commitMessage - Mensaje del commit
     */
    async savePedidos(pedidos, commitMessage = 'Actualizar pedidos - Analytics Dashboard') {
        if (!this.isConfigured()) {
            throw new Error('Configuración incompleta. Por favor, configura tu llave de acceso.');
        }

        try {
            // Intentar obtener el contenido actual para obtener el SHA
            let sha = null;
            try {
                const existing = await this.getFileContent();
                if (existing) {
                    sha = existing.sha;
                }
            } catch (error) {
                console.log('Archivo no existe, se creará uno nuevo');
            }

            // Preparar el contenido con JSON.stringify preservando caracteres especiales
            const fileContent = JSON.stringify(pedidos, null, 2);
            
            // Codificar a Base64 preservando UTF-8
            const encoder = new TextEncoder();
            const data = encoder.encode(fileContent);
            const encodedContent = btoa(String.fromCharCode.apply(null, data));

            // Preparar el body de la solicitud
            const body = {
                message: commitMessage,
                content: encodedContent,
                branch: GITHUB_CONFIG.BRANCH
            };

            if (sha) {
                body.sha = sha; // Necesario para actualizar archivo existente
            }

            // Hacer la solicitud PUT a GitHub
            const response = await fetch(
                `${this.apiBase}/repos/${GITHUB_CONFIG.REPO}/contents/${GITHUB_CONFIG.FILE_PATH}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json; charset=utf-8'
                    },
                    body: JSON.stringify(body)
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Error ${response.status}: ${errorData.message || response.statusText}`);
            }

            const result = await response.json();
            return {
                success: true,
                message: 'Pedidos guardados exitosamente en base de datos',
                commit: result.commit.html_url,
                sha: result.content.sha
            };
        } catch (error) {
            throw new Error(`Error al guardar pedidos: ${error.message}`);
        }
    }

    /**
     * Carga los pedidos desde GitHub
     */
    async loadPedidos() {
        if (!this.isConfigured()) {
            throw new Error('Configuración incompleta.');
        }

        try {
            const result = await this.getFileContent();
            if (!result) {
                return [];
            }
            return result.content;
        } catch (error) {
            throw new Error(`Error al cargar pedidos: ${error.message}`);
        }
    }

    /**
     * Obtiene el historial de commits del archivo
     */
    async getCommitHistory(limit = 10) {
        if (!this.isConfigured()) {
            throw new Error('Configuración incompleta.');
        }

        try {
            const response = await fetch(
                `${this.apiBase}/repos/${GITHUB_CONFIG.REPO}/commits?path=${GITHUB_CONFIG.FILE_PATH}&per_page=${limit}`,
                {
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const commits = await response.json();
            return commits.map(commit => ({
                sha: commit.sha.substring(0, 7),
                message: commit.commit.message,
                author: commit.commit.author.name,
                date: new Date(commit.commit.author.date),
                url: commit.html_url
            }));
        } catch (error) {
            throw new Error(`Error al obtener historial: ${error.message}`);
        }
    }

    /**
     * Sube un archivo a GitHub usando la API (para repositorio Casa Fresca)
     * @param {string} filePath - Ruta del archivo en el repositorio
     * @param {string} base64Content - Contenido en Base64
     * @param {string} message - Mensaje del commit
     */
    async uploadFile(filePath, base64Content, message = 'Actualizar archivo') {
        if (!this.isConfigured()) {
            throw new Error('Llave de acceso no configurada');
        }

        try {
            // Obtener SHA del archivo si existe (para actualización)
            let sha = null;
            try {
                const response = await fetch(
                    `${this.apiBase}/repos/supportcasafresca-cpu/Casa-Fresca/contents/${filePath}`,
                    {
                        headers: {
                            'Authorization': `token ${this.token}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    sha = data.sha;
                }
            } catch (error) {
                console.log(`Archivo no existe o error al obtener SHA: ${filePath}`);
            }

            // Preparar el body
            const body = {
                message: message,
                content: base64Content,
                branch: 'main'
            };

            if (sha) {
                body.sha = sha;
            }

            // Hacer PUT a GitHub
            const response = await fetch(
                `${this.apiBase}/repos/supportcasafresca-cpu/Casa-Fresca/contents/${filePath}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                if (response.status === 409) {
                    throw new Error(`Conflicto al actualizar ${filePath}. Intenta de nuevo.`);
                } else if (response.status === 401) {
                    throw new Error('Llave de acceso inválida o expirada');
                }
                throw new Error(`Error ${response.status}: ${errorData.message || response.statusText}`);
            }

            const result = await response.json();
            return {
                success: true,
                message: `Archivo subido: ${filePath}`,
                commit: result.commit,
                sha: result.content.sha
            };
        } catch (error) {
            console.error('Error en uploadFile:', error);
            throw error;
        }
    }

    /**
     * Guarda los datos de notificación en el repositorio Casa Fresca
     * @param {Object} notificationData - Objeto con id, titulo, mensaje, subtitulo, tipo, icono
     * @param {String} commitMessage - Mensaje del commit
     */
    async saveNotificationData(notificationData, commitMessage = 'Actualizar notificación desde editor') {
        if (!this.isConfigured()) {
            throw new Error('Configuración incompleta. Por favor, configura tu llave de acceso.');
        }

        try {
            // Ruta del archivo en el repositorio Casa Fresca
            const filePath = 'Json/data.json';
            const repoPath = 'supportcasafresca-cpu/Casa-Fresca';

            // Obtener SHA del archivo si existe
            let sha = null;
            try {
                const response = await fetch(
                    `${this.apiBase}/repos/${repoPath}/contents/${filePath}`,
                    {
                        headers: {
                            'Authorization': `token ${this.token}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    sha = data.sha;
                }
            } catch (error) {
                console.log(`Archivo no existe, se creará uno nuevo: ${filePath}`);
            }

            // Preparar contenido con UTF-8
            const fileContent = JSON.stringify(notificationData, null, 4);
            
            // Codificar a Base64 preservando UTF-8
            const encoder = new TextEncoder();
            const data = encoder.encode(fileContent);
            const encodedContent = btoa(String.fromCharCode.apply(null, data));

            // Preparar body de la solicitud
            const body = {
                message: commitMessage,
                content: encodedContent,
                branch: 'main'
            };

            if (sha) {
                body.sha = sha;
            }

            // Hacer PUT a GitHub
            const response = await fetch(
                `${this.apiBase}/repos/supportcasafresca-cpu/Casa-Fresca/contents/${filePath}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json; charset=utf-8'
                    },
                    body: JSON.stringify(body)
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Error ${response.status}: ${errorData.message || response.statusText}`);
            }

            const result = await response.json();
            return {
                success: true,
                message: 'Notificación guardada exitosamente en GitHub',
                commit: result.commit.html_url,
                sha: result.content.sha,
                file: filePath
            };
        } catch (error) {
            throw new Error(`Error al guardar notificación: ${error.message}`);
        }
    }

    /**
     * Lista el contenido de un directorio en el repositorio Casa Fresca
     * @param {string} dirPath - Ruta dentro del repo (e.g., 'Img' o 'Img/products')
     * @returns {Promise<Array>} - Array de objetos con { name, path, type, sha, download_url }
     */
    async listRepoDirectory(dirPath = '') {
        if (!this.isConfigured()) {
            throw new Error('Llave de acceso no configurada');
        }

        try {
            const repoPath = `supportcasafresca-cpu/Casa-Fresca`;
            const url = `${this.apiBase}/repos/${repoPath}/contents/${dirPath}`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return [];
                }
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            // Si es un archivo único, devolverlo como array
            if (!Array.isArray(data)) return [data];
            return data.map(item => ({
                name: item.name,
                path: item.path,
                type: item.type,
                sha: item.sha,
                download_url: item.download_url,
                size: item.size || 0
            }));
        } catch (error) {
            throw new Error(`Error listando directorio: ${error.message}`);
        }
    }

    /**
     * Elimina un archivo del repositorio Casa Fresca
     * @param {string} filePath - Ruta completa del archivo en el repo (ej: 'Img/foo.jpg')
     * @param {string} commitMessage - Mensaje del commit de borrado
     */
    async deleteFileFromRepo(filePath, commitMessage = 'Eliminar archivo desde panel') {
        if (!this.isConfigured()) {
            throw new Error('Llave de acceso no configurada');
        }

        try {
            const repoPath = `supportcasafresca-cpu/Casa-Fresca`;

            // Obtener SHA del archivo
            const getResp = await fetch(`${this.apiBase}/repos/${repoPath}/contents/${filePath}`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!getResp.ok) {
                const err = await getResp.json().catch(() => ({}));
                throw new Error(`No se pudo obtener SHA: ${getResp.status} ${err.message || getResp.statusText}`);
            }

            const fileData = await getResp.json();
            const sha = fileData.sha;

            // Ejecutar DELETE con body
            const delResp = await fetch(`${this.apiBase}/repos/${repoPath}/contents/${filePath}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: commitMessage, sha, branch: 'main' })
            });

            if (!delResp.ok) {
                const errBody = await delResp.json().catch(() => ({}));
                throw new Error(`Error eliminando: ${delResp.status} ${errBody.message || delResp.statusText}`);
            }

            const result = await delResp.json();
            return { success: true, commit: result.commit, content: result.content };
        } catch (error) {
            throw new Error(`Error eliminando archivo: ${error.message}`);
        }
    }
}
/**
 * Módulo para gestionar el modal de guardado en GitHub
 * Muestra el estado de la operación: Cargando, Éxito o Error
 */

export class GitHubSaveModal {
    constructor() {
        this.modal = document.getElementById('github-save-modal');
        this.overlay = document.getElementById('modal-overlay');
        this.modalTitle = document.getElementById('modal-title');
        this.modalIcon = document.getElementById('modal-icon');
        this.statusText = document.getElementById('status-text');
        this.detailText = document.getElementById('detail-text');
        this.modalProgress = document.getElementById('modal-progress');
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');
        this.retryBtn = document.getElementById('modal-retry-btn');
        this.closeBtn = document.getElementById('modal-close-btn');
        this.closeFinalBtn = document.getElementById('modal-close-final-btn');
        this.onRetry = null;

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.closeBtn?.addEventListener('click', () => this.close());
        this.closeFinalBtn?.addEventListener('click', () => this.close());
        this.overlay?.addEventListener('click', () => this.close());
        this.retryBtn?.addEventListener('click', () => {
            if (this.onRetry) this.onRetry();
            this.showLoading();
        });
    }

    /**
     * Muestra el modal en estado de carga
     */
    showLoading() {
        this.setModalState('loading');
        this.modalTitle.textContent = 'Guardando pedidos...';
        this.modalIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        this.statusText.textContent = 'Conectando con GitHub...';
        this.detailText.textContent = 'Por favor espera';
        this.modalProgress.style.display = 'none';
        this.retryBtn.style.display = 'none';
        this.closeFinalBtn.style.display = 'none';
        this.show();
    }

    /**
     * Muestra el modal en estado de éxito
     * @param {String} message - Mensaje de éxito
     * @param {Number} orderCount - Cantidad de pedidos guardados
     */
    showSuccess(message, orderCount = 0) {
        this.setModalState('success');
        this.modalTitle.textContent = '✅ ¡Guardado Exitoso!';
        this.modalIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
        this.statusText.textContent = message;
        this.detailText.textContent = `${orderCount} pedido(s) guardado(s) correctamente en GitHub`;
        this.modalProgress.style.display = 'none';
        this.retryBtn.style.display = 'none';
        this.closeFinalBtn.style.display = 'block';
        // only show if not already visible (show() handles this check)
        this.show();
    }

    /**
     * Muestra el modal en estado de error
     * @param {String} errorMessage - Mensaje de error
     * @param {Function} retryCallback - Función a ejecutar al reintentar
     */
    showError(errorMessage, retryCallback = null) {
        this.setModalState('error');
        this.modalTitle.textContent = '❌ Error al Guardar';
        this.modalIcon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
        this.statusText.textContent = 'No se pudo guardar los pedidos';
        this.detailText.textContent = errorMessage;
        this.modalProgress.style.display = 'none';
        this.retryBtn.style.display = retryCallback ? 'block' : 'none';
        this.closeFinalBtn.style.display = 'block';
        this.onRetry = retryCallback;
        this.show();
    }

    /**
     * Muestra progreso en tiempo real
     * @param {Number} percent - Porcentaje completado (0-100)
     * @param {String} message - Mensaje de estado
     */
    showProgress(percent, message) {
        this.modalProgress.style.display = 'block';
        const validPercent = Math.min(100, Math.max(0, percent));
        this.progressFill.style.width = `${validPercent}%`;
        this.progressText.textContent = `${validPercent}%`;
        this.statusText.textContent = message;
    }

    /**
     * Actualiza el texto de detalle
     * @param {String} text - Nuevo texto
     */
    updateDetail(text) {
        this.detailText.textContent = text;
    }

    /**
     * Establece el estado visual del modal
     * @param {String} state - 'loading', 'success' o 'error'
     */
    setModalState(state) {
        this.modal?.classList.remove('loading', 'success', 'error');
        if (state) {
            this.modal?.classList.add(state);
        }
    }

    /**
     * Muestra el modal
     */
    show() {
        // avoid incrementing scroll lock if already visible
        if (this.modal?.classList.contains('active')) {
            return;
        }
        this.modal?.classList.add('active');
        disableBodyScroll();
    }

    /**
     * Cierra el modal
     */
    close() {
        this.modal?.classList.remove('active');
        this.setModalState(null);
        enableBodyScroll();
    }

    /**
     * Valida que el modal esté visible
     */
    isVisible() {
        return this.modal?.classList.contains('active');
    }
}
/**
 * Modal para listar imágenes en el repositorio supportcasafresca-cpu/Casa-Fresca (carpeta Img)
 * Agrupa por subcarpeta, marca si están en uso según productos y permite eliminar seleccionadas.
 */
export class GitHubImagesModal {
    constructor(githubManager, productManager) {
        this.githubManager = githubManager;
        this.productManager = productManager;
        this.modalId = 'github-images-modal';
        this.container = null;
        this.groups = [];
        this.selected = new Set();
        this.isLoading = false;
        this.filter = 'all'; // all | used | unused
        this.initDOM();
    }

    ensureCss() {
        const href = 'Css/github-images-modal.css';
        if (!document.querySelector(`link[href*="${href}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            document.head.appendChild(link);
        }
    }

    initDOM() {
        // Evitar crear modal duplicado
        if (document.getElementById(this.modalId)) {
            this.container = document.getElementById(this.modalId);
            return;
        }

        this.ensureCss();

        const modal = document.createElement('div');
        modal.id = this.modalId;
        modal.className = 'github-images-modal overlay hidden';

        modal.innerHTML = `
            <div class="gim-modal-card">
                <div class="gim-header">
                    <div class="gim-title">Imágenes en repositorio <span class="gim-sub">supportcasafresca-cpu/Casa-Fresca / Img</span></div>
                    <div class="gim-actions">
                        <select id="github-images-filter" class="gim-filter">
                            <option value="all">Todas</option>
                            <option value="used">Solo usadas</option>
                            <option value="unused">Solo no usadas</option>
                        </select>
                        <button id="github-images-refresh" class="btn btn-outline">Actualizar</button>
                        <button id="github-images-delete-selected" class="btn btn-danger" disabled>Eliminar seleccionadas</button>
                        <button id="github-images-close" class="btn">Cerrar</button>
                    </div>
                </div>
                <div id="github-images-body" class="gim-body"></div>
                <div id="github-images-footer" class="gim-footer">
                    <div id="github-images-status" class="gim-status"></div>
                    <div class="gim-progress"><div id="github-images-progress-fill" class="gim-progress-fill" style="--pct:0%"></div></div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.container = modal;

        // Event listeners
        modal.querySelector('#github-images-close').addEventListener('click', () => this.hide());
        modal.querySelector('#github-images-refresh').addEventListener('click', () => this.loadAndRender());
        modal.querySelector('#github-images-delete-selected').addEventListener('click', () => this.deleteSelected());
        modal.querySelector('#github-images-filter').addEventListener('change', (e) => {
            this.filter = e.target.value || 'all';
            this.renderGroups();
        });
    }

    show() {
        if (!this.githubManager || !this.githubManager.isConfigured()) {
            showAlert('Token de GitHub no configurado. Ve a ajustes y configura tu token.', 'error');
            return;
        }

        this.container.classList.remove('hidden');
        disableBodyScroll();
        this.loadAndRender();
    }

    hide() {
        if (this.container) this.container.classList.add('hidden');
        enableBodyScroll();
    }

    formatBytes(bytes) {
        if (!bytes && bytes !== 0) return '';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${sizes[i]}`;
    }

    async loadAndRender() {
        const body = this.container.querySelector('#github-images-body');
        const status = this.container.querySelector('#github-images-status');
        const progressFill = this.container.querySelector('#github-images-progress-fill');

        body.innerHTML = `<div class="gim-loading">Cargando listado de imágenes...</div>`;
        status.textContent = '';
        progressFill.style.width = '0%';
        this.selected.clear();

        try {
            this.isLoading = true;

            // 1) Obtener listados top-level dentro de Img
            const top = await this.githubManager.listRepoDirectory('Img');

            // Separar carpetas y archivos
            const folders = top.filter(i => i.type === 'dir');
            const filesRoot = top.filter(i => i.type === 'file');

            const groups = [];

            // Añadir archivos en la raíz de Images como grupo "root"
            if (filesRoot.length) {
                groups.push({ name: 'root', displayName: 'Raíz', files: filesRoot });
            }

            // Para cada carpeta listar su contenido
            for (const f of folders) {
                const items = await this.githubManager.listRepoDirectory(f.path);
                const onlyFiles = items.filter(i => i.type === 'file');
                groups.push({ name: f.name, displayName: f.name, files: onlyFiles });
            }

            this.groups = groups;

            // 2) Determinar imágenes en uso según products
            const usedNames = new Set();
            const products = this.productManager?.products || [];
            products.forEach(p => {
                if (Array.isArray(p.imagenes)) {
                    p.imagenes.forEach(img => {
                        if (!img) return;
                        const name = img.split('/').pop();
                        usedNames.add(name);
                    });
                }
            });

            this.usedNames = usedNames;

            // 3) Renderizar grupos
            this.renderGroups();

            status.textContent = `Listo — ${groups.reduce((s,g)=>s+g.files.length,0)} imágenes encontradas`;
        } catch (error) {
            body.innerHTML = `<div class="gim-error">Error cargando imágenes: ${error.message}</div>`;
            console.error('Error cargando imágenes desde GitHub:', error);
        } finally {
            this.isLoading = false;
        }
    }

    renderGroups() {
        const body = this.container.querySelector('#github-images-body');
        body.innerHTML = '';

        if (!this.groups || this.groups.length === 0) {
            body.innerHTML = '<div class="gim-empty">No se encontraron imágenes en Img/</div>';
            return;
        }

        for (const group of this.groups) {
            const section = document.createElement('div');
            section.className = 'gim-group';

            const header = document.createElement('div');
            header.className = 'gim-group-header';
            header.innerHTML = `<div class="gim-group-title">${group.displayName}</div><div class="gim-group-count">${group.files.length} archivo(s)</div><button class="gim-group-toggle" aria-expanded="true">▾</button>`;
            section.appendChild(header);

            const grid = document.createElement('div');
            grid.className = 'gim-grid';

            // Toggle expand/collapse
            const toggle = header.querySelector('.gim-group-toggle');
            toggle.addEventListener('click', () => {
                const expanded = toggle.getAttribute('aria-expanded') === 'true';
                toggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
                section.classList.toggle('collapsed', expanded);
            });

            group.files.forEach(file => {
                const name = file.name;
                const isUsed = this.usedNames && this.usedNames.has(name);
                if (this.filter === 'used' && !isUsed) return;
                if (this.filter === 'unused' && isUsed) return;

                const filePath = file.path;
                const thumbUrl = file.download_url || `https://raw.githubusercontent.com/supportcasafresca-cpu/Casa-Fresca/main/${file.path}`;
                const sizeLabel = this.formatBytes(file.size || 0);

                const card = document.createElement('div');
                card.className = 'gim-card';
                card.innerHTML = `
                    <div class="gim-thumb"><img src="${thumbUrl}" alt="${name}" onerror="this.src='Img/no_image.jpg'" /></div>
                    <div class="gim-meta">
                        <div class="gim-name" title="${name}">${name}</div>
                        <div class="gim-info"><span class="gim-size">${sizeLabel}</span><span class="gim-used ${isUsed? 'used':'unused'}">${isUsed? 'En uso':'No usado'}</span></div>
                    </div>
                    <div class="gim-actions">
                        <input type="checkbox" class="github-image-checkbox" data-path="${filePath}" />
                        <button class="btn btn-small btn-link github-image-open" data-url="${thumbUrl}">Abrir</button>
                    </div>
                `;

                const checkbox = card.querySelector('.github-image-checkbox');
                checkbox.addEventListener('change', (e) => {
                    if (checkbox.checked) this.selected.add(filePath);
                    else this.selected.delete(filePath);
                    this.updateDeleteButton();
                });

                card.querySelector('.github-image-open').addEventListener('click', (e) => {
                    window.open(thumbUrl, '_blank');
                });

                grid.appendChild(card);
            });

            section.appendChild(grid);
            body.appendChild(section);
        }

        this.updateDeleteButton();
    }

    updateDeleteButton() {
        const btn = this.container.querySelector('#github-images-delete-selected');
        if (!btn) return;
        btn.disabled = this.selected.size === 0;
        btn.textContent = this.selected.size > 0 ? `Eliminar seleccionadas (${this.selected.size})` : 'Eliminar seleccionadas';
    }

    async deleteSelected() {
        if (this.selected.size === 0) return;
        const ok = await (typeof modalConfirm === 'function' ? modalConfirm(`¿Eliminar ${this.selected.size} archivo(s) del repositorio? Esta acción es irreversible.`) : Promise.resolve(window.confirm(`¿Eliminar ${this.selected.size} archivo(s) del repositorio? Esta acción es irreversible.`)));
        if (!ok) return;

        const status = this.container.querySelector('#github-images-status');
        const progressFill = this.container.querySelector('#github-images-progress-fill');

        const items = Array.from(this.selected);
        const total = items.length;
        let done = 0;
        const failures = [];

        this.container.querySelector('#github-images-delete-selected').disabled = true;

        for (const path of items) {
            try {
                status.textContent = `Eliminando ${path}...`;
                await this.githubManager.deleteFileFromRepo(path, `Eliminar imagen ${path} desde panel`);
                done++;
                progressFill.style.width = `${Math.round((done/total)*100)}%`;
            } catch (err) {
                console.error('Error eliminando', path, err);
                failures.push({ path, error: err.message || String(err) });
            }
        }

        if (failures.length === 0) {
            status.textContent = `Eliminadas ${done}/${total} imágenes correctamente.`;
            // Recargar listado
            this.selected.clear();
            await this.loadAndRender();
        } else {
            status.innerHTML = `Eliminadas ${done}/${total}. Errores: ${failures.length}. Comprueba la consola para más detalles.`;
            console.warn('Fallos al eliminar imágenes:', failures);
        }

        this.container.querySelector('#github-images-delete-selected').disabled = false;
    }
}
