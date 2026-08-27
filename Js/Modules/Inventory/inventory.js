import { StagingDB, formatDate, CONFIG } from '../../Core/core.js';
import { GitHubManager, GitHubSaveModal, GitHubImagesModal } from '../Github/github.js';

/**
 * Utilidades para el Sistema de Gestión de Productos
 * Conversión de archivos, sanitización, encoding, etc.
 */

/**
 * Convierte un File a Base64 limpio (sin prefijo "data:image...")
 * @param {File} file - Archivo de imagen
 * @returns {Promise<string>} - Base64 sin prefijo
 */
export function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
        // Validar que file sea válido
        if (!file || !(file instanceof File)) {
            reject(new Error('Debe proporcionar un archivo válido'));
            return;
        }

        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                // reader.result o e.target.result es algo como: "data:image/jpeg;base64,/9j/4AAQSkZJ..."
                const base64WithPrefix = reader.result || (e && e.target && e.target.result) || e?.result;
                
                if (!base64WithPrefix || typeof base64WithPrefix !== 'string') {
                    throw new Error('No se pudo leer el archivo');
                }
                
                // Extraer solo la parte Base64
                const parts = base64WithPrefix.split(',');
                if (parts.length < 2) {
                    throw new Error('Formato de archivo inválido');
                }
                
                const base64Clean = parts[1];
                resolve(base64Clean);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = (error) => {
            reject(error);
        };
        
        reader.readAsDataURL(file);
    });
}

/**
 * Convierte Base64 limpio a Data URL
 * @param {string} base64 - Base64 sin prefijo
 * @param {string} mimeType - Tipo MIME (por defecto: image/jpeg)
 * @returns {string} - Data URL completo
 */
export function base64ToDataURL(base64, mimeType = 'image/jpeg') {
    return `data:${mimeType};base64,${base64}`;
}

/**
 * Limpia nombres de archivos (quita espacios, caracteres especiales)
 * @param {string} fileName - Nombre original del archivo
 * @returns {string} - Nombre sanitizado
 */
export function sanitizeFileName(fileName) {
    // Remover extensión temporalmente
    const ext = fileName.substring(fileName.lastIndexOf('.'));
    let name = fileName.substring(0, fileName.lastIndexOf('.'));
    
    // Reemplazar espacios con guiones
    name = name.replace(/\s+/g, '-');
    
    // Remover caracteres especiales (mantener solo alfanuméricos, guiones, guiones bajos)
    name = name.replace(/[^a-zA-Z0-9\-_]/g, '');
    
    // Convertir a minúsculas
    name = name.toLowerCase();
    
    // Remover guiones múltiples
    name = name.replace(/-+/g, '-');
    
    // Agregar timestamp para unicidad
    const timestamp = Date.now();
    
    return `${name}_${timestamp}${ext}`;
}

/**
 * Convierte un objeto a JSON Base64
 * @param {Object} obj - Objeto a convertir
 * @returns {string} - JSON codificado en Base64 con UTF-8
 */
export function objectToBase64(obj) {
    const jsonString = JSON.stringify(obj);
    // Codificar a Base64 preservando UTF-8
    const encoder = new TextEncoder();
    const data = encoder.encode(jsonString);
    return btoa(String.fromCharCode.apply(null, data));
}

/**
 * Decodifica JSON Base64
 * @param {string} base64String - String Base64
 * @returns {Object} - Objeto decodificado con UTF-8
 */
export function base64ToObject(base64String) {
    // Decodificar base64 preservando UTF-8
    const binaryString = atob(base64String);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const decoder = new TextDecoder('utf-8');
    const jsonString = decoder.decode(bytes);
    return JSON.parse(jsonString);
}

/**
 * Obtiene el MIME type de un archivo
 * @param {File} file - Archivo
 * @returns {string} - MIME type
 */
export function getFileMimeType(file) {
    return file.type || 'application/octet-stream';
}

/**
 * Valida que un archivo sea imagen
 * @param {File} file - Archivo a validar
 * @returns {boolean}
 */
export function isValidImageFile(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    return validTypes.includes(file.type);
}

/**
 * Valida el tamaño del archivo (máximo 5MB)
 * @param {File} file - Archivo a validar
 * @param {number} maxSizeMB - Tamaño máximo en MB (por defecto 5)
 * @returns {boolean}
 */
export function isValidFileSize(file, maxSizeMB = 5) {
    const maxBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxBytes;
}

/**
 * Formatea bytes a unidad legible
 * @param {number} bytes - Cantidad de bytes
 * @returns {string} - Tamaño formateado
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Genera un ID único para productos
 * @returns {string} - ID único
 */
export function generateProductId() {
    return `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Valida estructura de producto
 * @param {Object} product - Producto a validar
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
export function validateProduct(product) {
    const errors = [];

    if (!product.nombre || product.nombre.trim() === '') {
        errors.push('El nombre del producto es requerido');
    }

    if (product.precio === undefined || product.precio === null || product.precio < 0) {
        errors.push('El precio debe ser un número positivo');
    }

    if (!product.categoria || product.categoria.trim() === '') {
        errors.push('La categoría es requerida');
    }

    if (product.descripcion && product.descripcion.length > 500) {
        errors.push('La descripción no puede exceder 500 caracteres');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Crea una URL temporal para una imagen Base64 (para vista previa)
 * @param {string} base64 - Base64 sin prefijo
 * @param {string} mimeType - MIME type
 * @returns {string} - URL de Blob
 */
export function createObjectURL(base64, mimeType = 'image/jpeg') {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
}

/**
 * Libera una URL de Blob
 * @param {string} objectURL - URL creada con createObjectURL
 */
export function revokeObjectURL(objectURL) {
    URL.revokeObjectURL(objectURL);
}
/**
 * Cliente API para Inventario Interno
 * Maneja comunicación con backend para datos privados de productos
 * (stock, precio_compra, proveedor, notas, last_updated)
 */

export class InventoryApiClient {
    constructor(backendUrl = null) {
        // Si no se proporciona URL, detectar automáticamente según el entorno
        if (!backendUrl) {
            // En desarrollo: localhost:10000
            // En producción: backend-casa-fresca.onrender.com
            const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (isDevelopment && window.location.port === '5500') {
                // Ambiente de desarrollo con Live Server
                backendUrl = 'http://localhost:10000';
            } else {
                // Producción o entorno remoto
                backendUrl = CONFIG.BACKEND_URL;
            }
        }
        this.backendUrl = backendUrl;
        this.timeout = 15000; // 15 segundos timeout (más tolerante para Apps Script lentos)
        // Cache en memoria para reducir peticiones repetidas durante la sesión
        this._cache = new Map(); // key -> {data, ts}
        this._cacheTTL = 10 * 60 * 1000; // 10 minutos (evita reconsultas frecuentes)
    }

    /**
     * Obtiene datos privados del inventario para un producto
     * @param {string} productId - ID del producto
     * @returns {Promise<Object>} Datos privados del producto
     */
    async getInventory(productId, { useCache = true, retries = 2 } = {}) {
        if (!productId) {
            throw new Error('El ID del producto es requerido');
        }

        // Revisa cache
        if (useCache && this._cache.has(productId)) {
            const entry = this._cache.get(productId);
            if ((Date.now() - entry.ts) < this._cacheTTL) {
                // console.log(`🧾 Cache hit inventario ${productId}`);
                return entry.data;
            }
            this._cache.delete(productId);
        }

        const url = `${this.backendUrl}/inventario/${productId}`;
        console.log(`🔍 Obteniendo inventario de: ${url}`);

        let attempt = 0;
        while (attempt <= retries) {
            try {
                const response = await this._fetchWithTimeout(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    if (response.status === 404) {
                        console.log(`⚠️ No hay inventario para el producto ${productId}`);
                        const normalized = this._normalizeInventoryData(null, productId);
                        this._cache.set(productId, { data: normalized, ts: Date.now() });
                        return normalized;
                    }
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const rawData = await response.json();
                console.log(`📦 Datos crudos recibidos del backend:`, rawData);

                const normalizedData = this._normalizeInventoryData(rawData, productId);
                console.log(`✅ Datos normalizados:`, normalizedData);

                // Guardar en cache
                this._cache.set(productId, { data: normalizedData, ts: Date.now() });

                return normalizedData;
            } catch (error) {
                attempt++;
                console.error(`❌ Error al obtener inventario del producto ${productId}:`, error.message || error);
                if (attempt > retries) {
                    // No lanzar: devolver objeto vacío normalizado para que la UI no se quede bloqueada.
                    console.warn(`⚠️ Falló obtener inventario para ${productId} después de ${retries} reintentos. Devolviendo objeto vacío normalizado.`);
                    const normalized = this._normalizeInventoryData(null, productId);
                    // Guardar placeholder en cache para evitar reintentos inmediatos
                    this._cache.set(productId, { data: normalized, ts: Date.now() });
                    return normalized;
                }
                // Backoff exponencial (200ms, 400ms, 800ms...)
                const backoff = 200 * Math.pow(2, attempt - 1);
                await new Promise(res => setTimeout(res, backoff));
            }
        }
    }
    
    /**
     * Intenta parsear un valor JSON si es string que contenga JSON
     * @private
     */
    _tryParseJSON(value) {
        if (typeof value !== 'string') return value;
        const trimmed = value.trim();
        if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return value;
        try {
            return JSON.parse(trimmed);
        } catch (e) {
            return value; // no es JSON válido, devolver string original
        }
    }

    /**
     * Extrae un valor primitivo (number|string|null) de estructuras comunes
     * Maneja: número, string, objeto {value: X}, {stock: X}, arrays, etc.
     * @private
     */
    _extractPrimitive(val) {
        if (val === null || val === undefined) return null;
        // Intentar parsear si es string con JSON
        const parsed = this._tryParseJSON(val);
        if (parsed !== val) return this._extractPrimitive(parsed);
        if (typeof parsed === 'number' || typeof parsed === 'string' || typeof parsed === 'boolean') return parsed;
        if (Array.isArray(parsed) && parsed.length > 0) return this._extractPrimitive(parsed[0]);
        if (typeof parsed === 'object') {
            // Buscar campos comunes que podrían contener el valor
            const candidates = ['value','valor','cantidad','stock','amount','precio','precio_compra','price'];
            for (const c of candidates) {
                if (parsed[c] !== undefined) return this._extractPrimitive(parsed[c]);
            }
            // Si no hay candidato, intentar stringify a cadena legible
            try { return JSON.stringify(parsed); } catch (e) { return null; }
        }
        return null;
    }

    /**
     * Normaliza los datos del Google Apps Script al formato esperado
     * Mapea diferentes posibles estructuras de respuesta y parsea strings JSON
     * @param {Object} rawData - Datos crudos del backend
     * @param {string} productId - ID del producto
     * @returns {Object} Datos normalizados
     */
    _normalizeInventoryData(rawData, productId) {
        // Si no hay datos, devolver objeto vacío
        if (!rawData) {
            return {
                product_id: productId,
                stock: null,
                precio_compra: null,
                proveedor: null,
                notas: null,
                last_updated: null,
                hasData: false
            };
        }

        // Si la respuesta viene como string JSON, parsearla
        if (typeof rawData === 'string') {
            const parsed = this._tryParseJSON(rawData);
            if (parsed !== rawData) rawData = parsed;
        }

        // Si la respuesta es un objeto con propiedad 'data' (envoltorio)
        if (rawData.data && typeof rawData.data === 'object') {
            return this._normalizeInventoryData(rawData.data, productId);
        }

        // Si es un array, tomar el primer elemento
        if (Array.isArray(rawData) && rawData.length > 0) {
            return this._normalizeInventoryData(rawData[0], productId);
        }

        // Mapear campos posibles del Google Apps Script y extraer primitivos
        const stockRaw = rawData.stock !== undefined ? rawData.stock : 
                         rawData.Stock !== undefined ? rawData.Stock :
                         rawData.cantidad !== undefined ? rawData.cantidad :
                         rawData.amount !== undefined ? rawData.amount : null;
        const stock = this._extractPrimitive(stockRaw);

        const precioRaw = rawData.precio_compra !== undefined ? rawData.precio_compra :
                         rawData.precio !== undefined ? rawData.precio :
                         rawData.Precio !== undefined ? rawData.Precio :
                         rawData.precioCompra !== undefined ? rawData.precioCompra : null;
        const precioPrincipal = this._extractPrimitive(precioRaw);

        const proveedorRaw = rawData.proveedor !== undefined ? rawData.proveedor :
                         rawData.Proveedor !== undefined ? rawData.Proveedor :
                         rawData.supplier !== undefined ? rawData.supplier : null;
        const proveedor = this._extractPrimitive(proveedorRaw);

        const notasRaw = rawData.notas !== undefined ? rawData.notas :
                     rawData.Notas !== undefined ? rawData.Notas :
                     rawData.notes !== undefined ? rawData.notes : null;
        const notas = this._extractPrimitive(notasRaw);

        const lastUpdatedRaw = rawData.last_updated !== undefined ? rawData.last_updated :
                           rawData.última_actualización !== undefined ? rawData.última_actualización :
                           rawData.updatedAt !== undefined ? rawData.updatedAt :
                           rawData.fecha_actualización !== undefined ? rawData.fecha_actualización : null;
        const lastUpdated = this._extractPrimitive(lastUpdatedRaw);

        // Verificar si hay al menos un dato
        const hasData = (stock !== null && stock !== undefined && stock !== '') || (precioPrincipal !== null && precioPrincipal !== undefined && precioPrincipal !== '') || proveedor !== null || notas !== null;

        return {
            product_id: productId,
            stock: stock !== null ? (isNaN(Number(stock)) ? stock : Number(stock)) : null,
            precio_compra: precioPrincipal !== null ? (isNaN(Number(precioPrincipal)) ? precioPrincipal : Number(precioPrincipal)) : null,
            proveedor: proveedor !== null ? String(proveedor) : null,
            notas: notas !== null ? String(notas) : null,
            last_updated: lastUpdated !== null ? String(lastUpdated) : null,
            hasData: !!hasData,
            rawData: rawData // Debug: incluir datos crudos para inspección
        };
    }

    /**
     * Guarda o actualiza datos privados del inventario
     * @param {string} productId - ID del producto
     * @param {Object} inventoryData - Datos a guardar {stock, precio_compra, proveedor, notas}
     * @returns {Promise<Object>} Respuesta del servidor con datos guardados
     */
    async saveInventory(productId, inventoryData) {
        if (!productId) {
            throw new Error('El ID del producto es requerido');
        }

        if (!inventoryData || typeof inventoryData !== 'object') {
            throw new Error('Los datos del inventario son requeridos y deben ser un objeto');
        }

        try {
            // INVALIDAR CACHE para este producto (para que próxima lectura sea fresca)
            if (this._cache.has(productId)) {
                this._cache.delete(productId);
                console.log(`🗑️ Cache invalidado para producto ${productId}`);
            }
            const url = `${this.backendUrl}/inventario/${productId}`;
            
            const payload = {
                product_id: productId,
                stock: inventoryData.stock !== '' && inventoryData.stock !== null ? parseInt(inventoryData.stock, 10) : null,
                precio_compra: inventoryData.precio_compra !== '' && inventoryData.precio_compra !== null ? parseFloat(inventoryData.precio_compra) : null,
                proveedor: inventoryData.proveedor && inventoryData.proveedor.trim() ? inventoryData.proveedor.trim() : null,
                notas: inventoryData.notas && inventoryData.notas.trim() ? inventoryData.notas.trim() : null
            };

            const response = await this._fetchWithTimeout(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            // Normalizar respuesta y actualizar cache para que próximas lecturas sean consistentes
            const normalized = this._normalizeInventoryData(result && result.data ? result.data : result, productId);
            this._cache.set(productId, { data: normalized, ts: Date.now() });
            return normalized;
        } catch (error) {
            console.error(`Error al guardar inventario del producto ${productId}:`, error);
            throw error;
        }
    }

    /**
     * Elimina datos del inventario para un producto
     * Busca por product_id en la hoja de Google Sheets y elimina la fila correspondiente
     * @param {string} productId - ID del producto a eliminar
     * @returns {Promise<boolean>} true si se eliminó correctamente
     */
    async deleteInventory(productId) {
        if (!productId) {
            throw new Error('El ID del producto es requerido');
        }

        try {
            // Invalidar cache
            if (this._cache.has(productId)) {
                this._cache.delete(productId);
                console.log(`🗑️ Cache invalidado para producto ${productId}`);
            }

            const url = `${this.backendUrl}/inventario/${productId}`;

            const response = await this._fetchWithTimeout(url, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 404) {
                console.log(`ℹ️ Inventario no encontrado para producto ${productId} (probablemente no había datos)`);
                return true;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            console.log(`✅ Inventario eliminado para producto ${productId}`);
            return true;
        } catch (error) {
            console.error(`Error al eliminar inventario del producto ${productId}:`, error);
            throw error;
        }
    }

    /**
     * Wrapper para fetch con timeout
     * @private
     */
    async _fetchWithTimeout(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`Timeout: La solicitud tardó más de ${this.timeout}ms`);
            }
            throw error;
        }
    }

    /**
     * Establece una URL de backend diferente (útil para cambiar entre entornos)
     */
    setBackendUrl(url) {
        this.backendUrl = url;
    }

    /**
     * Intenta obtener inventarios en lote si el backend lo soporta.
     * Si la ruta bulk no está disponible, lanza y el llamador puede volver a la estrategia individual.
     * @param {Array<string>} ids
     * @returns {Promise<Object>} Mapa id => normalizedData
     */
    async getInventoriesBulk(ids = []) {
        if (!Array.isArray(ids)) return {};

        // Revisar cache para respuestas completas
        const result = {};
        const idsToFetch = [];
        ids.forEach(id => {
            const entry = this._cache.get(id);
            if (entry && (Date.now() - entry.ts) < this._cacheTTL) {
                result[id] = entry.data;
            } else {
                idsToFetch.push(id);
            }
        });

        // Si ids está vacío, intentaremos obtener todo el sheet (si el backend lo soporta)
        if (ids.length === 0) {
            try {
                console.log('🔍 getInventoriesBulk: solicitando todos los inventarios (endpoint /inventario)');
                const response = await this._fetchWithTimeout(`${this.backendUrl}/inventario`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
                if (response && response.ok) {
                    const raw = await response.json();
                    let arr = Array.isArray(raw) ? raw : (raw && raw.data && Array.isArray(raw.data) ? raw.data : []);
                    arr.forEach(item => {
                        const id = item.product_id || item.productId || item.id || null;
                        const norm = id ? this._normalizeInventoryData(item, id) : null;
                        if (id && norm) {
                            result[id] = norm;
                            this._cache.set(id, { data: norm, ts: Date.now() });
                        }
                    });
                    return result;
                }
            } catch (err) {
                console.warn('getInventoriesBulk(all) falló:', err.message || err);
            }
            // si falla, continuar al flujo normal con idsToFetch
        }

        if (idsToFetch.length === 0) return result;

        // Probar endpoint bulk: /inventario?ids=id1,id2 or /inventarios?ids=...
        // Priorizar endpoint que devuelva todo el sheet si está disponible
        const tryUrls = [
            `${this.backendUrl}/inventario`,
            `${this.backendUrl}/inventario?ids=${idsToFetch.join(',')}`,
            `${this.backendUrl}/inventarios?ids=${idsToFetch.join(',')}`
        ];

        for (const url of tryUrls) {
            try {
                console.log(`🔍 Intentando obtener inventarios en lote: ${url}`);
                const response = await this._fetchWithTimeout(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
                if (!response.ok) {
                    // si 404, seguir intentando otras rutas
                    console.warn(`Bulk endpoint respondio HTTP ${response.status} para ${url}`);
                    continue;
                }
                const raw = await response.json();
                let arr = [];
                if (Array.isArray(raw)) arr = raw;
                else if (raw && raw.data && Array.isArray(raw.data)) arr = raw.data;
                else if (typeof raw === 'object') {
                    // si viene como objeto mapa id->obj
                    arr = Object.values(raw);
                }

                // Normalizar cada elemento y poblar result + cache
                arr.forEach(item => {
                    const id = item.product_id || item.productId || item.id || null;
                    const norm = id ? this._normalizeInventoryData(item, id) : null;
                    if (id && norm) {
                        result[id] = norm;
                        this._cache.set(id, { data: norm, ts: Date.now() });
                    }
                });

                // Para los ids que no vinieron en la respuesta, poner placeholder
                idsToFetch.forEach(id => {
                    if (!result[id]) {
                        result[id] = this._normalizeInventoryData(null, id);
                        this._cache.set(id, { data: result[id], ts: Date.now() });
                    }
                });

                return result;
            } catch (err) {
                console.warn(`Intento bulk fallido para ${url}:`, err.message || err);
                // probar siguiente URL
            }
        }

        // Si llegamos aquí, ninguno de los endpoints bulk funcionó
        throw new Error('Bulk endpoint no disponible');
    }

    /**
     * Verifica disponibilidad del backend
     */
    async isAvailable() {
        try {
            const response = await this._fetchWithTimeout(`${this.backendUrl}/api/server-status`, {
                method: 'GET'
            });
            return response.ok;
        } catch (error) {
            console.warn('Backend no disponible:', error.message);
            return false;
        }
    }
}

// Export singleton por defecto
export const inventoryApiClient = new InventoryApiClient();
/**
 * Módulo de manejo de inventario de productos
 * Carga productos desde GitHub y renderiza la tienda
 */


export class InventoryManager {
    constructor(githubManager = null) {
        this.products = [];
        this.filteredProducts = [];
        this.categories = [];
        this.modifiedProducts = []; // Productos en staging (sin guardar)
        this.baseImageUrl = 'https://raw.githubusercontent.com/supportcasafresca-cpu/Casa-Fresca/refs/heads/main/Img/products/';
        this.productsJsonUrl = 'https://raw.githubusercontent.com/supportcasafresca-cpu/Casa-Fresca/refs/heads/main/Json/products.json';
        this.categoriesJsonUrl = './Json/category.json';
        this.githubManager = githubManager;
        this.lastSyncTime = null;
        this.syncInProgress = false;
        this.loadCategoriesFromStorage();
        // Productos modificados solo en memoria (no persistir en localStorage)
        // Se pierden al recargar página, lo cual es intencional por requisito del usuario
    }

    /**
     * Carga categorías del localStorage
     */
    loadCategoriesFromStorage() {
        const stored = localStorage.getItem('casa_fresca_categories');
        if (stored) {
            try {
                this.categories = JSON.parse(stored);
            } catch (e) {
                console.warn('Error parsing categories from storage');
                this.categories = [];
            }
        }
    }



    /**
     * Carga las categorías desde JSON local
     */
    async loadCategories() {
        try {
            const response = await fetch(this.categoriesJsonUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data.categories && Array.isArray(data.categories)) {
                this.categories = data.categories;
                localStorage.setItem('casa_fresca_categories', JSON.stringify(this.categories));
            } else {
                throw new Error('Estructura de JSON inválida: se esperaba { categories: [...] }');
            }
            
            return this.categories;
        } catch (error) {
            console.error('Error al cargar categorías:', error);
            throw error;
        }
    }

    /**
     * Obtiene lista de nombres de categorías
     */
    getCategoryNames() {
        return this.categories.map(cat => cat.nombre).sort();
    }

    /**
     * Carga los productos desde el JSON remoto
     */
    async loadProducts() {
        try {
            const response = await fetch(this.productsJsonUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            // La estructura es { products: [...] }
            if (data.products && Array.isArray(data.products)) {
                this.products = data.products;
            } else {
                throw new Error('Estructura de JSON inválida: se esperaba { products: [...] }');
            }
            
            this.normalizeProducts();
            this.filteredProducts = [...this.products];
            return this.products;
        } catch (error) {
            console.error('Error al cargar productos:', error);
            throw error;
        }
    }

    /**
     * Normaliza la estructura de los productos
     */
    normalizeProducts() {
        this.products.forEach((product, index) => {
            // Generar ID único si no existe
            product.id = product.id || `prod_${index}_${Date.now()}`;
            
            // Asegurar que el precio es numérico
            product.precio = parseFloat(product.precio) || 0;
            product.descuento = parseFloat(product.descuento) || 0;
            
            // Calcular precio con descuento
            const precioConDescuento = product.precio * (1 - product.descuento / 100);
            product.precioFinal = parseFloat(precioConDescuento.toFixed(2));
            
            // Asegurar disponibilidad
            product.disponibilidad = product.disponibilidad !== false;
            
            // Construir URL de imagen
            if (product.imagenes && Array.isArray(product.imagenes) && product.imagenes.length > 0) {
                product.imagenUrl = `${this.baseImageUrl}${product.imagenes[0]}`;
            } else {
                // Imagen por defecto si no hay imagen
                product.imagenUrl = 'Img/no_image.jpg';
            }
            
            // Crear campo de búsqueda
            product.searchText = `${product.nombre} ${product.categoria} ${product.descripcion}`.toLowerCase();
            // Normalizar timestamps si existen o mapear campo legacy 'hora'
            product.created_at = product.created_at || product.hora || null;
            product.modified_at = product.modified_at || product.created_at || null;
        });
    }

    /**
     * Filtra productos por término de búsqueda
     */
    search(searchTerm) {
        const term = searchTerm.toLowerCase();
        this.filteredProducts = this.products.filter(product =>
            product.searchText.includes(term)
        );
        return this.filteredProducts;
    }

    /**
     * Filtra productos por categoría
     */
    filterByCategory(category) {
        if (category === 'todos') {
            this.filteredProducts = [...this.products];
        } else {
            this.filteredProducts = this.products.filter(product =>
                product.categoria.toLowerCase() === category.toLowerCase()
            );
        }
        return this.filteredProducts;
    }

    /**
     * Obtiene todas las categorías únicas
     */
    getCategories() {
        const categories = new Set(this.products.map(p => p.categoria));
        return Array.from(categories).sort();
    }

    /**
     * Filtra por rango de precio
     */
    filterByPrice(minPrice, maxPrice) {
        this.filteredProducts = this.products.filter(product =>
            product.precioFinal >= minPrice && product.precioFinal <= maxPrice
        );
        return this.filteredProducts;
    }

    /**
     * Filtra por disponibilidad
     */
    filterByAvailability(available) {
        this.filteredProducts = this.products.filter(product =>
            available ? product.disponibilidad : !product.disponibilidad
        );
        return this.filteredProducts;
    }

    /**
     * Obtiene productos destacados (nuevos, ofertas, más vendidos)
     */
    getHighlightedProducts(type = 'todos') {
        let highlighted = this.products;
        
        if (type === 'nuevos') {
            highlighted = this.products.filter(p => p.nuevo === true);
        } else if (type === 'ofertas') {
            highlighted = this.products.filter(p => p.oferta === true);
        } else if (type === 'mas_vendidos') {
            highlighted = this.products.filter(p => p.mas_vendido === true);
        }
        
        return highlighted.sort((a, b) => b.precio - a.precio);
    }

    /**
     * Obtiene estadísticas del inventario
     */
    getStats() {
        const totalProducts = this.products.length;
        const availableProducts = this.products.filter(p => p.disponibilidad).length;
        const unavailableProducts = totalProducts - availableProducts;
        const averagePrice = this.products.length > 0 
            ? this.products.reduce((sum, p) => sum + p.precioFinal, 0) / this.products.length 
            : 0;
        const categories = this.getCategories().length;
        const productsWithDiscount = this.products.filter(p => p.descuento > 0).length;

        return {
            totalProducts,
            availableProducts,
            unavailableProducts,
            averagePrice: parseFloat(averagePrice.toFixed(2)),
            categories,
            productsWithDiscount
        };
    }

    /**
     * Agrega un producto a la lista de modificados (staging)
     * Los cambios se mantienen solo en memoria hasta guardar/sincronizar
     */
    addModifiedProduct(product) {
        // Buscar si ya existe
        const existingIndex = this.modifiedProducts.findIndex(p => p.id === product.id);
        
        if (existingIndex >= 0) {
            // Actualizar el existente
            this.modifiedProducts[existingIndex] = { ...product, modified_at: new Date().toISOString() };
        } else {
            // Agregar nuevo
            const nowIso = new Date().toISOString();
            // Si no tiene created_at, asignarla al crear por primera vez en staging
            const created = product.created_at || nowIso;
            this.modifiedProducts.push({ ...product, created_at: created, modified_at: nowIso });
        }
        
        // NO guardar en localStorage - solo en memoria por requisito del usuario
        return this.modifiedProducts;
    }

    /**
     * Obtiene todos los productos modificados
     */
    getModifiedProducts() {
        return this.modifiedProducts;
    }

    /**
     * Limpia la lista de productos modificados
     */
    clearModifiedProducts() {
        this.modifiedProducts = [];
    }

    /**
     * Elimina un producto de la lista de modificados
     */
    removeModifiedProduct(productId) {
        this.modifiedProducts = this.modifiedProducts.filter(p => p.id !== productId);
        // NO guardar en localStorage - solo en memoria
        return this.modifiedProducts;
    }

    /**
     * Descarga productos desde GitHub y sincroniza
     */
    async syncWithGitHub() {
        if (!this.githubManager) {
            throw new Error('GitHubManager no está configurado');
        }

        if (this.syncInProgress) {
            console.log('Sincronización ya en progreso...');
            return;
        }

        try {
            this.syncInProgress = true;
            console.log('🔄 Sincronizando productos desde GitHub...');

            // Descargar productos del repo
            const remoteData = await this.githubManager.getProducts();
            
            if (remoteData && remoteData.products) {
                // Comparar y resolver conflictos
                const updatedProducts = this.mergeProducts(this.products, remoteData.products);
                this.products = updatedProducts;
                this.normalizeProducts();
                this.filteredProducts = [...this.products];
                
                this.lastSyncTime = new Date().toISOString();
                console.log('✅ Productos sincronizados correctamente');
                return { success: true, syncTime: this.lastSyncTime };
            }
        } catch (error) {
            console.error('Error en sincronización:', error.message);
            throw error;
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Fusiona productos locales con remotos (resuelve conflictos)
     * Estrategia: Local gana si más reciente, sino remoto
     */
    mergeProducts(localProducts, remoteProducts) {
        if (!remoteProducts || remoteProducts.length === 0) {
            return localProducts;
        }

        const remoteMap = new Map(remoteProducts.map(p => [p.nombre, p]));
        const result = [];

        // Procesar productos locales
        for (const local of localProducts) {
            const remote = remoteMap.get(local.nombre);
            
            if (remote) {
                // Producto existe en ambos lados
                const localTime = new Date(local.modified_at || 0);
                const remoteTime = new Date(remote.modified_at || 0);

                // Usar el más reciente
                result.push(localTime > remoteTime ? local : remote);
                remoteMap.delete(local.nombre);
            } else {
                // Producto solo en local
                result.push(local);
            }
        }

        // Agregar productos que solo existen en remoto
        for (const remote of remoteMap.values()) {
            result.push(remote);
        }

        return result;
    }

    /**
     * Prepara los datos para guardar en GitHub
     */
    /**
     * Obtiene SOLO los cambios pendientes (productos nuevos + modificados)
     * SIN los campos internos (_previousNombre, _imageFile, etc)
     * El merge con el JSON existente se hace en GitHub
     */
    getPendingChangesAsJSON() {
        const changes = this.modifiedProducts.map(p => {
            // ⭐ IMPORTANTE: Crear objeto limpio con solo los campos del JSON
            // Incluir _previousNombre si existe (es importante para merge)
            const cleanProduct = {
                nombre: p.nombre || '',
                categoria: p.categoria || '',
                precio: parseFloat(p.precio) || 0,
                descuento: parseFloat(p.descuento) || 0,
                mas_vendido: p.mas_vendido || false,
                nuevo: p.nuevo || false,
                oferta: p.oferta || false,
                imagenes: Array.isArray(p.imagenes) ? p.imagenes : [],
                descripcion: p.descripcion || '',
                disponibilidad: p.disponibilidad !== false,
                // Mantener timestamps ISO para sincronización
                created_at: p.created_at || new Date().toISOString(),
                modified_at: p.modified_at || new Date().toISOString(),
                // Campo legacy de visualización local (formato legible)
            };

            // ⭐ Agregar _previousNombre si existe (necesario para identificar renombramientos)
            if (p._previousNombre) {
                cleanProduct._previousNombre = p._previousNombre;
            }

            return cleanProduct;
        });
        return changes;
    }

    /**
     * ⭐ NUEVO: Valida la integridad de los datos de un producto
     * Asegura que no hay datos corruptos o inconsistentes
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    validateProductData(product) {
        const errors = [];

        // Validar campos requeridos
        if (!product.nombre || product.nombre.trim() === '') {
            errors.push('Nombre vacío');
        }
        if (!product.categoria || product.categoria.trim() === '') {
            errors.push('Categoría vacía');
        }

        // Validar tipos de datos
        if (isNaN(parseFloat(product.precio))) {
            errors.push('Precio no es numérico');
        }
        if (isNaN(parseFloat(product.descuento))) {
            errors.push('Descuento no es numérico');
        }

        // Validar rangos
        if (parseFloat(product.precio) < 0) {
            errors.push('Precio no puede ser negativo');
        }
        if (parseFloat(product.descuento) < 0 || parseFloat(product.descuento) > 100) {
            errors.push('Descuento debe estar entre 0 y 100');
        }

        // Validar imagenes
        if (!Array.isArray(product.imagenes)) {
            errors.push('Imágenes no es un array');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * ⭐ NUEVO: Obtiene datos clasificados para sincronización
     * Separa productos nuevos de modificados y valida cada uno
     * @returns {Object} { newProducts: [], modifiedProducts: [], errors: [] }
     */
    getClassifiedPendingChanges() {
        const result = {
            newProducts: [],
            modifiedProducts: [],
            errors: []
        };

        for (const product of this.modifiedProducts) {
            // Validar datos
            const validation = this.validateProductData(product);
            if (!validation.valid) {
                result.errors.push({
                    producto: product.nombre,
                    errores: validation.errors
                });
                continue;
            }

            // Clasificar como nuevo o modificado
            const existingInOriginal = this.products.some(
                p => p.nombre === product.nombre || p.id === product.id
            );

            if (existingInOriginal) {
                result.modifiedProducts.push(product);
            } else {
                result.newProducts.push(product);
            }
        }
        return result;
    }

    /**
     * Obtiene estadísticas de cambios pendientes
     */
    getPendingStats() {
        return {
            totalChanges: this.modifiedProducts.length,
            newProducts: this.modifiedProducts.filter(p => !this.products.some(op => op.nombre === p.nombre)).length,
            modifiedProducts: this.modifiedProducts.filter(p => this.products.some(op => op.nombre === p.nombre && op.id === p.id)).length,
            hasChanges: this.modifiedProducts.length > 0,
            lastSyncTime: this.lastSyncTime
        };
    }
}/**
 * Gestor de Packs con Lógica de Staging
 * Modelo basado en productManager.js pero adaptado a packs.json y Img/Packs/
 */


const PACK_CONFIG = {
    GITHUB_API: {
        REPO_OWNER: "supportcasafresca-cpu",
        REPO_NAME: "Casa-Fresca",
        BRANCH: "main",
        PACKS_FILE_PATH: "Json/packs.json",
        IMAGE_PATH_PREFIX: "Img/Packs/"
    }
};

export class PackManager {
    constructor(githubManager = null) {
        this.packs = [];
        this.stagingDB = new StagingDB();
        this.githubManager = githubManager;
        this.stagedChanges = [];
        this.isLoading = false;
        this.lastSync = null;

        this.loadStagedChanges();
    }

    async init() {
        await this.stagingDB.initStagingDB();
        console.log('PackManager inicializado');
    }

    async loadPacks() {
        if (this.isLoading) return this.packs;
        this.isLoading = true;
        try {
            const url = `${this.getPacksFileUrl()}?t=${Date.now()}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            if (data.packs && Array.isArray(data.packs)) {
                this.packs = data.packs;
                this.normalizePacks();
                // Reconcile staged changes against freshly loaded packs
                try { this.reconcileStagedChangesWithRemote(); } catch(e) { console.warn('reconcileStagedChangesWithRemote error', e); }
            } else {
                throw new Error('Estructura JSON inválida: se esperaba { packs: [...] }');
            }
            this.isLoading = false;
            console.log(`${this.packs.length} packs cargados desde GitHub`);
            return this.packs;
        } catch (error) {
            this.isLoading = false;
            console.error('Error al cargar packs:', error);
            throw error;
        }
    }

    reconcileStagedChangesWithRemote() {
        // Remove staged 'delete' changes if the pack no longer exists in remote packs
        const existingIds = new Set((this.packs || []).map(p => String(p.id)));
        const beforeCount = this.stagedChanges.length;
        this.stagedChanges = this.stagedChanges.filter(change => {
            if (!change || !change.type) return false;
            if (change.type === 'delete') {
                // If remote already doesn't have the pack, drop the staged delete
                if (change.packId && !existingIds.has(String(change.packId))) {
                    // also remove any staged image if present
                    if (change.imageKey) {
                        try { this.stagingDB.deleteImageFromIDB(change.imageKey); } catch(e) { console.warn('delete staged image failed', e); }
                    }
                    return false;
                }
            }
            // keep other changes
            return true;
        });
        if (this.stagedChanges.length !== beforeCount) this.saveStagedChanges();
    }

    normalizePacks() {
        this.packs.forEach((pack) => {
            // Ensure pack has a stable numeric string id when possible
            if (!pack.id) pack.id = String(this.getNextPackId());
            else pack.id = String(pack.id);
            pack.precio = parseFloat(pack.precio) || 0;
            pack.descuento = parseFloat(pack.descuento) || 0;
            if (pack.oferta === true) {
                const precioConDescuento = pack.precio * (1 - pack.descuento / 100);
                pack.precioFinal = parseFloat(precioConDescuento.toFixed(2));
            } else {
                pack.precioFinal = pack.precio;
            }
            pack.disponible = pack.disponible !== false;

            // Normalizar imagen: packs usan campo 'imagen' (string) -> convertir a imagenes array
            if (pack.imagen) {
                pack.imagenes = [pack.imagen];
            }

            if (pack.imagenes && Array.isArray(pack.imagenes) && pack.imagenes.length > 0) {
                pack.imagenUrl = `${this.getImageUrl(pack.imagenes[0])}`;
            } else {
                pack.imagenUrl = 'Img/no_image.jpg';
            }

            pack.searchText = `${pack.nombre} ${pack.categoria || ''} ${pack.descripcion || ''}`.toLowerCase();
            pack.created_at = pack.created_at || pack.hora || null;
            pack.modified_at = pack.modified_at || pack.created_at || null;
        });
    }

    getMaxNumericPackId() {
        let maxId = 0;
        // Check existing packs
        this.packs.forEach(p => {
            const asNum = parseInt(p.id, 10);
            if (!isNaN(asNum) && asNum > maxId) maxId = asNum;
        });
        // Also consider staged new packs
        this.stagedChanges.forEach(c => {
            if (c.type === 'new' && c.packId) {
                const asNum = parseInt(c.packId, 10);
                if (!isNaN(asNum) && asNum > maxId) maxId = asNum;
            }
        });
        return maxId;
    }

    getNextPackId() {
        const max = this.getMaxNumericPackId();
        return max + 1;
    }

    async stageChange(type, packData, imageFile = null) {
        if (!['new', 'modify', 'delete'].includes(type)) throw new Error('Tipo de cambio inválido');

        const validation = validateProduct(packData);
        if (!validation.isValid) throw new Error(`Pack inválido: ${validation.errors.join(', ')}`);

        if (type === 'new' && !packData.id) packData.id = String(this.getNextPackId());

        let originalPackName = null;
        if (type === 'modify') {
            const existing = this.packs.find(p => p.id === packData.id);
            if (existing) originalPackName = existing.nombre;
        }

        const change = {
            id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            timestamp: Date.now(),
            packId: packData.id,
            productData: JSON.parse(JSON.stringify(packData)),
            originalPackName,
            hasNewImage: false,
            imageKey: null,
            originalImagePath: null
        };

        if (imageFile) {
            if (!isValidImageFile(imageFile)) throw new Error('El archivo debe ser una imagen válida (JPEG, PNG, GIF, WebP)');
            if (!isValidFileSize(imageFile)) throw new Error('El archivo excede 5MB');
            try {
                const base64 = await fileToDataURL(imageFile);
                const imageKey = sanitizeFileName(imageFile.name);
                change.imageKey = imageKey;
                change.hasNewImage = true;
                await this.stagingDB.saveImageToIDB(imageKey, base64);
                change.productData.imagenes = [imageKey];
                console.log(`Imagen procesada y guardada: ${imageKey}`);
            } catch (error) {
                console.error('Error procesando imagen:', error);
                throw error;
            }
        }

        this.stagedChanges.push(change);
        this.saveStagedChanges();
        return change;
    }

    getStagedChanges() { return this.stagedChanges; }

    getStagingStats() {
        return {
            total: this.stagedChanges.length,
            new: this.stagedChanges.filter(c => c.type === 'new').length,
            modify: this.stagedChanges.filter(c => c.type === 'modify').length,
            delete: this.stagedChanges.filter(c => c.type === 'delete').length,
            withImages: this.stagedChanges.filter(c => c.hasNewImage).length
        };
    }

    async discardChange(changeId) {
        const idx = this.stagedChanges.findIndex(c => c.id === changeId);
        if (idx === -1) throw new Error('Cambio no encontrado');
        const change = this.stagedChanges[idx];
        if (change.imageKey) await this.stagingDB.deleteImageFromIDB(change.imageKey);
        this.stagedChanges.splice(idx, 1);
        this.saveStagedChanges();
        return true;
    }

    async discardAllChanges() {
        await this.stagingDB.clearAllImages();
        this.stagedChanges = [];
        this.saveStagedChanges();
        return true;
    }

    async saveAllStagedChanges(progressCallback = null) {
        if (!this.githubManager) throw new Error('GitHubManager no está configurado');
        if (!this.githubManager.isConfigured()) throw new Error('Token de GitHub no configurado');
        if (this.stagedChanges.length === 0) return { success: true, message: 'No hay cambios para sincronizar' };

        try {
            const processedPacks = JSON.parse(JSON.stringify(this.packs));
            const report = (percent, message) => { try { if (typeof progressCallback === 'function') progressCallback(percent, message); } catch(e){} };
            report(5, 'Iniciando procesamiento de cambios...');

            let processedCount = 0;
            for (const change of this.stagedChanges) {
                processedCount++;
                report(Math.round((processedCount / this.stagedChanges.length) * 50), `Procesando cambios (${processedCount}/${this.stagedChanges.length})...`);

                if (change.hasNewImage && change.imageKey) {
                    const imageData = await this.stagingDB.getImageFromIDB(change.imageKey);
                    if (imageData) {
                        const uploadPath = `${PACK_CONFIG.GITHUB_API.IMAGE_PATH_PREFIX}${change.imageKey}`;
                        await this.githubManager.uploadFile(uploadPath, imageData.base64);
                    }
                }

                if (change.type === 'new') {
                    const exists = processedPacks.some(p => p.nombre === change.productData.nombre);
                    if (!exists) {
                        const packToAdd = this.preparePackForExport(change.productData);
                        const nowIso = new Date().toISOString();
                        packToAdd.created_at = packToAdd.created_at || nowIso;
                        packToAdd.modified_at = packToAdd.modified_at || nowIso;
                        processedPacks.push(packToAdd);
                    }
                } else if (change.type === 'modify') {
                    const searchName = change.originalPackName || change.productData.nombre;
                    const index = processedPacks.findIndex(p => p.nombre === searchName);
                    if (index !== -1) {
                        const packToUpdate = this.preparePackForExport(change.productData);
                        const existing = processedPacks[index] || {};
                        packToUpdate.created_at = packToUpdate.created_at || existing.created_at || existing.hora || null;
                        packToUpdate.modified_at = new Date().toISOString();
                        processedPacks[index] = packToUpdate;
                        try {
                            if (change.hasNewImage && existing && Array.isArray(existing.imagenes) && existing.imagenes.length > 0) {
                                const oldImages = existing.imagenes.filter(n => !!n && n !== change.imageKey);
                                for (const oldImg of oldImages) {
                                    const oldPath = `${PACK_CONFIG.GITHUB_API.IMAGE_PATH_PREFIX}${oldImg}`;
                                    try { await this.githubManager.deleteFileFromRepo(oldPath, `Eliminar imagen antigua ${oldImg} al modificar pack ${change.productData.nombre}`); } catch(e) { console.warn('No se pudo eliminar imagen antigua', e); }
                                }
                            }
                        } catch (err) { console.warn('Error al intentar eliminar imagen anterior durante modify:', err); }
                    } else {
                        throw new Error(`No se pudo encontrar el pack "${searchName}" para modificar`);
                    }
                } else if (change.type === 'delete') {
                    const searchName = change.originalPackName || change.productData.nombre;
                    const index = processedPacks.findIndex(p => p.nombre === searchName);
                    if (index !== -1) {
                        try {
                            const prod = processedPacks[index];
                            if (prod && Array.isArray(prod.imagenes) && prod.imagenes.length > 0) {
                                for (const imgName of prod.imagenes) {
                                    if (!imgName) continue;
                                    const imgPath = `${PACK_CONFIG.GITHUB_API.IMAGE_PATH_PREFIX}${imgName}`;
                                    try { await this.githubManager.deleteFileFromRepo(imgPath, `Eliminar imagen ${imgName} al borrar pack ${searchName}`); } catch (err) { console.warn(`No se pudo eliminar imagen ${imgName}:`, err.message || err); }
                                }
                            }
                        } catch (err) { console.warn('Error al intentar eliminar imágenes asociadas durante delete:', err); }
                        processedPacks.splice(index, 1);
                    } else {
                        throw new Error(`No se pudo encontrar el pack "${searchName}" para eliminar`);
                    }
                }
            }

            const fileContent = { packs: processedPacks };
            if (!Array.isArray(fileContent.packs)) throw new Error('Error crítico: La estructura de packs no es un array válido');

            let uploadResult = null;
            try {
                const jsonString = JSON.stringify(fileContent, null, 2);
                const reParsed = JSON.parse(jsonString);
                if (!reParsed.packs || !Array.isArray(reParsed.packs)) throw new Error('JSON no es válido después de serialización');
                if (reParsed.packs.length !== processedPacks.length) throw new Error('Mismatch de cantidad de packs');
                // Codificar a Base64 preservando UTF-8
                const encoder = new TextEncoder();
                const data = encoder.encode(jsonString);
                const base64Content = btoa(String.fromCharCode.apply(null, data));
                uploadResult = await this.githubManager.uploadFile(PACK_CONFIG.GITHUB_API.PACKS_FILE_PATH, base64Content, `Actualizar packs - ${processedPacks.length} items (${this.stagedChanges.length} cambios)`);
            } catch (error) { console.error('Error validando o serializando JSON:', error); throw error; }

            await this.discardAllChanges();
            this.lastSync = new Date();
            return { success: true, message: 'Sincronización packs completada', filesUpdated: this.stagedChanges.length + 1, commitSha: uploadResult?.commit?.sha || null };
        } catch (error) {
            console.error('Error sincronizando cambios packs:', error);
            throw error;
        }
    }

    saveStagedChanges() {
        const stagedMetadata = this.stagedChanges.map(change => ({
            id: change.id,
            type: change.type,
            timestamp: change.timestamp,
            packId: change.packId,
            productData: change.productData,
            hasNewImage: change.hasNewImage,
            imageKey: change.imageKey
        }));
        localStorage.setItem('casa_fresca_packs_staged_changes', JSON.stringify(stagedMetadata));
    }

    loadStagedChanges() {
        const stored = localStorage.getItem('casa_fresca_packs_staged_changes');
        if (stored) {
            try {
                const metadata = JSON.parse(stored);
                this.stagedChanges = metadata.map(meta => ({ ...meta, id: meta.id || `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` }));
            } catch (error) {
                console.warn('Error cargando cambios packs:', error);
                this.stagedChanges = [];
            }
        }
    }

    getPacksFileUrl() {
        return `https://raw.githubusercontent.com/${PACK_CONFIG.GITHUB_API.REPO_OWNER}/${PACK_CONFIG.GITHUB_API.REPO_NAME}/${PACK_CONFIG.GITHUB_API.BRANCH}/${PACK_CONFIG.GITHUB_API.PACKS_FILE_PATH}`;
    }

    getImageUrl(imageName) {
        return `https://raw.githubusercontent.com/${PACK_CONFIG.GITHUB_API.REPO_OWNER}/${PACK_CONFIG.GITHUB_API.REPO_NAME}/${PACK_CONFIG.GITHUB_API.BRANCH}/${PACK_CONFIG.GITHUB_API.IMAGE_PATH_PREFIX}${imageName}`;
    }

    searchPacks(term) {
        const t = term.toLowerCase();
        return this.packs.filter(p => p.searchText.includes(t));
    }

    filterByCategory(category) {
        if (!category || category === 'todos') return this.packs;
        return this.packs.filter(p => (p.categoria || '').toLowerCase() === category.toLowerCase());
    }

    getAllCategories() { const cats = new Set(this.packs.map(p => p.categoria || '')); return Array.from(cats).sort(); }

    getPackById(id) { return this.packs.find(p => p.id === id) || null; }

    preparePackForExport(packData) {
        if (!packData.nombre || typeof packData.nombre !== 'string') throw new Error('El campo "nombre" es requerido y debe ser texto');
        return {
            // Preserve id when exporting (as string)
            id: packData.id ? String(packData.id) : undefined,
            nombre: String(packData.nombre).trim(),
            categoria: String(packData.categoria || '').trim(),
            precio: parseFloat(packData.precio) || 0,
            descuento: parseFloat(packData.descuento || 0),
            top: Boolean(packData.top || false),
            nuevo: Boolean(packData.nuevo || false),
            oferta: Boolean(packData.oferta || false),
            disponible: packData.disponible !== false,
            // Export as single 'imagen' to match existing packs.json structure
            imagenes: Array.isArray(packData.imagenes) ? packData.imagenes : (packData.imagen ? [packData.imagen] : []),
            imagen: (Array.isArray(packData.imagenes) && packData.imagenes.length > 0) ? packData.imagenes[0] : (packData.imagen || null),
            descripcion: String(packData.descripcion || '').trim(),
            caracteristicas: Array.isArray(packData.caracteristicas) ? packData.caracteristicas : [],
            created_at: packData.created_at || packData.hora || null,
            modified_at: packData.modified_at || packData.hora || null
        };
    }
}
/**
 * Gestor de Productos con Lógica de Staging
 * Maneja el ciclo completo: Load → Edit/Stage → Sync a GitHub
 */


const PRODUCT_CONFIG = {
    GITHUB_API: {
        REPO_OWNER: "supportcasafresca-cpu",
        REPO_NAME: "Casa-Fresca",
        BRANCH: "main",
        PRODUCTS_FILE_PATH: "Json/products.json",
        IMAGE_PATH_PREFIX: "Img/products/"
    }
};

export class ProductManager {
    constructor(githubManager = null) {
        this.products = []; // Productos originales cargados de GitHub
        this.stagingDB = new StagingDB();
        this.githubManager = githubManager;
        this.stagedChanges = []; // Array de cambios en staging
        this.isLoading = false;
        this.lastSync = null;
        this._lastLoadTs = null; // timestamp de última carga de productos
        this._loadingInventories = false; // indicador para mostrar 'Cargando...' en tarjetas
        this._lastInventoryLoadTs = null; // timestamp de última carga de inventarios

        this.loadStagedChanges();
    }

    /**
     * Inicializa el ProductManager
     */
    async init() {
        await this.stagingDB.initStagingDB();
        console.log('ProductManager inicializado');
    }

    /**
     * Carga productos desde GitHub con anti-caché y throttling
     * @param {boolean} force - Forzar recarga desde el servidor ignorando cache TTL
     * @returns {Promise<Array>}
     */
    async loadProducts(force = false) {
        if (this.isLoading) return this.products;

        // TTL para evitar recargas constantes
        const TTL = 60 * 1000; // 60s
        if (!force && this._lastLoadTs && (Date.now() - this._lastLoadTs) < TTL) {
            console.log('📌 loadProducts: usando cache local (TTL no expirado)');
            return this.products;
        }

        this.isLoading = true;
        try {
            // URL con timestamp para evitar caché
            const url = `${this.getProductsFileUrl()}?t=${Date.now()}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Validar estructura
            if (data.products && Array.isArray(data.products)) {
                this.products = data.products;
                this.normalizeProducts();
                // Enriquecer productos con datos de inventario (stock, precio_compra)
                // Hacer en background para no bloquear render inicial. Evitar iniciar si ya está corriendo o si se cargó recientemente.
                const INV_TTL = 60 * 1000; // 60s
                if (!this._loadingInventories && (!this._lastInventoryLoadTs || (Date.now() - this._lastInventoryLoadTs) > INV_TTL)) {
                    this._loadInventoriesForProducts()
                        .then(() => { this._lastInventoryLoadTs = Date.now(); console.log('Carga de inventarios finalizada'); })
                        .catch(e => console.warn('Error al cargar inventarios de productos:', e));
                } else {
                    console.log('Carga de inventarios ya en progreso o se cargó recientemente, no iniciar otra');
                }
            } else {
                throw new Error('Estructura JSON inválida: se esperaba { products: [...] }');
            }

            this._lastLoadTs = Date.now();
            this.isLoading = false;
            console.log(`${this.products.length} productos cargados desde GitHub`);
            return this.products;
        } catch (error) {
            this.isLoading = false;
            console.error('Error al cargar productos:', error);
            throw error;
        }
    }

    /**
     * Normaliza estructura de productos
     */
    normalizeProducts() {
        this.products.forEach((product) => {
            // Generar ID si no existe
            if (!product.id) {
                product.id = generateProductId();
            }
            
            // Normalizar precio
            product.precio = parseFloat(product.precio) || 0;
            product.descuento = parseFloat(product.descuento) || 0;
            
            // Calcular precio final solo si tiene oferta
            if (product.oferta === true) {
                const precioConDescuento = product.precio * (1 - product.descuento / 100);
                product.precioFinal = parseFloat(precioConDescuento.toFixed(2));
            } else {
                product.precioFinal = product.precio;
            }
            
            // Normalizar disponibilidad
            product.disponibilidad = product.disponibilidad !== false;
            
            // Crear URL de imagen
            if (product.imagenes && Array.isArray(product.imagenes) && product.imagenes.length > 0) {
                product.imagenUrl = `${this.getImageUrl(product.imagenes[0])}`;
            } else {
                product.imagenUrl = 'Img/no_image.jpg';
            }
            
            // Crear campo de búsqueda
            product.searchText = `${product.nombre} ${product.categoria} ${product.descripcion || ''}`.toLowerCase();
            // Normalizar timestamps si existen o mapear campo legacy 'hora'
            product.created_at = product.created_at || product.hora || null;
            product.modified_at = product.modified_at || product.created_at || null;
            // Inicializar datos de inventario por defecto (se llenarán al cargar productos)
            product.inventory = null;
            product.stock = null;
            product.precio_compra = null;
        });
    }

    /**
     * Carga datos de inventario para cada producto (no bloquea si algunos fallan)
     * @param {number} concurrency - Número de peticiones paralelas por lote
     */
    async _loadInventoriesForProducts(concurrency = 10) {
        const prods = this.products || [];
        if (!prods.length) return;

        this._loadingInventories = true;

        try {
            // Intentar bulk primero (si el backend soporta devolver todo)
            const ids = prods.map(p => p.id);
            try {
                const bulk = await inventoryApiClient.getInventoriesBulk(ids);
                let enrichedCount = 0;
                prods.forEach(p => {
                    const inv = bulk[p.id];
                    if (inv && inv.hasData) {
                        p.inventory = inv;
                        p.stock = inv.stock !== undefined ? inv.stock : null;
                        p.precio_compra = inv.precio_compra !== undefined ? inv.precio_compra : null;
                        enrichedCount++;
                    } else {
                        p.inventory = null;
                        p.stock = null;
                        p.precio_compra = null;
                    }
                });
                console.log(`📦 Inventario (bulk): ${enrichedCount}/${prods.length} productos enriquecidos con datos`);
                // Notificar UI que hay actualizaciones (todos a la vez)
                document.dispatchEvent(new CustomEvent('inventories:updated', { detail: { ids } }));
                return;
            } catch (err) {
                console.warn('Bulk inventories no disponible, usando fallback individual por chunks', err.message || err);
            }

            // Fallback individual con concurrencia por chunks (con soft-timeout por producto y actualizaciones progresivas)
            let enrichedCount = 0;
            const SOFT_TIMEOUT_MS = 3000; // si una petición individual tarda más, actualizamos UI con placeholder y esperamos la respuesta en background
            for (let i = 0; i < prods.length; i += concurrency) {
                const chunk = prods.slice(i, i + concurrency);
                await Promise.all(chunk.map((product) => {
                    const invPromise = inventoryApiClient.getInventory(product.id, { retries: 1, useCache: true }).catch(err => {
                        console.warn(`getInventory falló (se devolverá placeholder) para ${product.id}:`, err && err.message ? err.message : err);
                        // Devolver placeholder normalizado para no romper el flujo
                        return { product_id: product.id, stock: null, precio_compra: null, proveedor: null, notas: null, last_updated: null, hasData: false };
                    });

                    const softTimeout = new Promise(res => setTimeout(() => res('__INVENTORY_SOFT_TIMEOUT__'), SOFT_TIMEOUT_MS));

                    return Promise.race([invPromise, softTimeout]).then(async (result) => {
                        if (result === '__INVENTORY_SOFT_TIMEOUT__') {
                            // Mostrar placeholder inmediatamente para no dejar la tarjeta bloqueada
                            product.inventory = product.inventory || null;
                            product.stock = (product.stock !== undefined && product.stock !== null) ? product.stock : null;
                            product.precio_compra = (product.precio_compra !== undefined && product.precio_compra !== null) ? product.precio_compra : null;
                            // Notificar UI que este producto tiene una actualización (placeholder)
                            document.dispatchEvent(new CustomEvent('inventories:updated', { detail: { ids: [product.id] } }));

                            // Esperar el invPromise en background y actualizar cuando llegue
                            try {
                                const invFinal = await invPromise;
                                if (invFinal && invFinal.hasData) {
                                    product.inventory = invFinal;
                                    product.stock = invFinal.stock !== undefined ? invFinal.stock : null;
                                    product.precio_compra = invFinal.precio_compra !== undefined ? invFinal.precio_compra : null;
                                    enrichedCount++;
                                } else {
                                    product.inventory = null;
                                    product.stock = null;
                                    product.precio_compra = null;
                                }
                                // Notificar UI con los datos finales cuando estén disponibles
                                document.dispatchEvent(new CustomEvent('inventories:updated', { detail: { ids: [product.id] } }));
                            } catch (err) {
                                console.warn(`Error resolviendo invPromise en background para ${product.id}:`, err && err.message ? err.message : err);
                            }
                        } else {
                            // Resultado inmediato (invPromise resolvió rápido)
                            const inv = result;
                            if (inv && inv.hasData) {
                                product.inventory = inv;
                                product.stock = inv.stock !== undefined ? inv.stock : null;
                                product.precio_compra = inv.precio_compra !== undefined ? inv.precio_compra : null;
                                enrichedCount++;
                            } else {
                                product.inventory = null;
                                product.stock = null;
                                product.precio_compra = null;
                            }
                        }
                    }).catch(err => {
                        console.warn(`No se pudo cargar inventario para ${product.id}:`, err && err.message ? err.message : err);
                        product.inventory = null;
                        product.stock = null;
                        product.precio_compra = null;
                    });
                }));
                // Notificar UI tras cada chunk para render progresivo (ids del chunk)
                const idsUpdated = chunk.map(p => p.id);
                document.dispatchEvent(new CustomEvent('inventories:updated', { detail: { ids: idsUpdated } }));
            }
            console.log(`📦 Inventario (fallback): ${enrichedCount}/${prods.length} productos enriquecidos con datos`);
        } finally {
            this._loadingInventories = false;
            this._lastInventoryLoadTs = Date.now();
        }
    }

    /**
     * Crea un cambio en staging (nuevo, modificado, eliminado)
     * @param {string} type - 'new', 'modify', 'delete'
     * @param {Object} productData - Datos del producto
     * @param {File} imageFile - Archivo de imagen (opcional)
     * @returns {Promise<Object>} - Cambio creado
     */
    async stageChange(type, productData, imageFile = null) {
        // Validar tipo de cambio
        if (!['new', 'modify', 'delete'].includes(type)) {
            throw new Error('Tipo de cambio inválido');
        }

        // Validar datos del producto
        const validation = validateProduct(productData);
        if (!validation.isValid) {
            throw new Error(`Producto inválido: ${validation.errors.join(', ')}`);
        }

        // Generar ID si es nuevo (asegurar unicidad respecto a productos actuales y cambios staged)
        if (type === 'new' && !productData.id) {
            let newId;
            const exists = (id) => {
                return this.products.some(p => p.id === id) || this.stagedChanges.some(c => c.productId === id) || this.stagedChanges.some(c => c.productData && c.productData.id === id);
            };
            do {
                newId = generateProductId();
            } while (exists(newId));
            productData.id = newId;
        }

        // Si es modificación, guardar el nombre original para referencia
        let originalProductName = null;
        if (type === 'modify') {
            const existingProduct = this.products.find(p => p.id === productData.id);
            if (existingProduct) {
                originalProductName = existingProduct.nombre;
            }
        }

        const change = {
            id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            timestamp: Date.now(),
            productId: productData.id,
            productData: JSON.parse(JSON.stringify(productData)), // Deep copy
            originalProductName: originalProductName, // Guardar nombre original para búsqueda
            hasNewImage: false,
            imageKey: null,
            originalImagePath: null
        };

        // Procesar imagen si existe
        if (imageFile) {
            if (!isValidImageFile(imageFile)) {
                throw new Error('El archivo debe ser una imagen válida (JPEG, PNG, GIF, WebP)');
            }

            if (!isValidFileSize(imageFile)) {
                throw new Error('El archivo excede 5MB');
            }

            try {
                // Convertir a Base64
                const base64 = await fileToDataURL(imageFile);

                // Generar clave única
                const imageKey = sanitizeFileName(imageFile.name);
                change.imageKey = imageKey;
                change.hasNewImage = true;

                // Guardar en IndexedDB
                await this.stagingDB.saveImageToIDB(imageKey, base64);

                // Actualizar ruta de imagen en producto
                change.productData.imagenes = [imageKey];

                console.log(`Imagen procesada y guardada: ${imageKey}`);
            } catch (error) {
                console.error('Error procesando imagen:', error);
                throw error;
            }
        }

        // Guardar cambio en staged_changes
        this.stagedChanges.push(change);
        this.saveStagedChanges();

        return change;
    }

    /**
     * Obtiene los cambios en staging
     * @returns {Array}
     */
    getStagedChanges() {
        return this.stagedChanges;
    }

    /**
     * Obtiene estadísticas de cambios en staging
     * @returns {Object}
     */
    getStagingStats() {
        const stats = {
            total: this.stagedChanges.length,
            new: this.stagedChanges.filter(c => c.type === 'new').length,
            modify: this.stagedChanges.filter(c => c.type === 'modify').length,
            delete: this.stagedChanges.filter(c => c.type === 'delete').length,
            withImages: this.stagedChanges.filter(c => c.hasNewImage).length
        };
        return stats;
    }

    /**
     * Descarta un cambio en staging
     * @param {string} changeId - ID del cambio
     * @returns {Promise}
     */
    async discardChange(changeId) {
        const changeIndex = this.stagedChanges.findIndex(c => c.id === changeId);
        if (changeIndex === -1) {
            throw new Error('Cambio no encontrado');
        }

        const change = this.stagedChanges[changeIndex];

        // Eliminar imagen de IndexedDB si existe
        if (change.imageKey) {
            await this.stagingDB.deleteImageFromIDB(change.imageKey);
        }

        // Remover del array
        this.stagedChanges.splice(changeIndex, 1);
        this.saveStagedChanges();

        return true;
    }

    /**
     * Descarta todos los cambios en staging
     * @returns {Promise}
     */
    async discardAllChanges() {
        // Limpiar todas las imágenes de IDB
        await this.stagingDB.clearAllImages();

        // Vaciar array
        this.stagedChanges = [];
        this.saveStagedChanges();

        return true;
    }

    /**
     * Sincroniza todos los cambios con GitHub
     * @returns {Promise<Object>} - Resultado de sincronización
     */
    async saveAllStagedChanges(progressCallback = null) {
        if (!this.githubManager) {
            throw new Error('GitHubManager no está configurado');
        }

        if (!this.githubManager.isConfigured()) {
            throw new Error('Token de GitHub no configurado');
        }

        if (this.stagedChanges.length === 0) {
            return { success: true, message: 'No hay cambios para sincronizar' };
        }

        try {
            // 1. Procesar cambios
            const processedProducts = JSON.parse(JSON.stringify(this.products));

            // helper para reportar progreso de manera segura
            const report = (percent, message) => {
                try { if (typeof progressCallback === 'function') progressCallback(percent, message); } catch(e) { console.warn('progressCallback error', e); }
            };

            report(5, 'Iniciando procesamiento de cambios...');

            let processedCount = 0;
            // Acumulador de guardados de inventario que se ejecutarán tras subir el archivo de productos a GitHub
            const pendingInventorySaves = [];
            // Resumen de resultados de guardado de inventario (disponible al final del método)
            let inventorySaveSummary = { succeeded: [], failed: [] };
            for (const change of this.stagedChanges) {
                console.log(`Procesando cambio: ${change.type} - ${change.productId}`);

                processedCount++;
                report(Math.round((processedCount / this.stagedChanges.length) * 50), `Procesando cambios (${processedCount}/${this.stagedChanges.length})...`);

                // 2. Subir imágenes nuevas/modificadas
                if (change.hasNewImage && change.imageKey) {
                    const imageData = await this.stagingDB.getImageFromIDB(change.imageKey);
                    if (imageData) {
                        const uploadPath = `${PRODUCT_CONFIG.GITHUB_API.IMAGE_PATH_PREFIX}${change.imageKey}`;
                        const uploadResult = await this.githubManager.uploadFile(
                            uploadPath,
                            imageData.base64
                        );
                        console.log(`Imagen subida: ${uploadPath}`);
                        report(null, `Imagen subida: ${change.imageKey}`);
                    }
                }

                // 3. Aplicar cambios al array de productos
                if (change.type === 'new') {
                    // Validar que no exista duplicado
                    const exists = processedProducts.some(p => p.nombre === change.productData.nombre);
                    if (!exists) {
                        const productToAdd = this.prepareProductForExport(change.productData);
                        // Asignar timestamps de creación/modificación al agregar nuevo
                        const nowIso = new Date().toISOString();
                        productToAdd.created_at = productToAdd.created_at || nowIso;
                        productToAdd.modified_at = productToAdd.modified_at || nowIso;
                        processedProducts.push(productToAdd);
                        
                        // Si el producto nuevo incluye datos del bloque "Inventario Interno" en el modal,
                        // acumular la petición de guardado para ejecutarla DESPUÉS de subir el archivo de productos.
                        try {
                            const invCandidates = {
                                stock: ['stock', 'inventory_stock', 'inventory-stock', 'inventoryStock'],
                                precio_compra: ['precio_compra', 'inventory_precio_compra', 'inventory-precio-compra', 'inventoryPrecioCompra'],
                                proveedor: ['proveedor', 'inventory_proveedor', 'inventory-proveedor', 'inventoryProveedor'],
                                notas: ['notas', 'inventory_notas', 'inventory-notas', 'inventoryNotas']
                            };
                            const getFirst = (obj, keys) => {
                                for (const k of keys) {
                                    if (obj && obj.hasOwnProperty(k) && obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') return obj[k];
                                }
                                return null;
                            };

                            const hasInv = Object.values(invCandidates).some(keys => getFirst(change.productData, keys) !== null);
                            if (hasInv) {
                                // Asegurar que el producto tenga ID (generar si por alguna razón faltara)
                                let productId = productToAdd.id || change.productData.id;
                                if (!productId) {
                                    if (typeof generateProductId === 'function') {
                                        productId = generateProductId();
                                    } else {
                                        productId = `${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
                                    }
                                    // Actualizar referencias
                                    productToAdd.id = productId;
                                    change.productData.id = productId;
                                    change.productId = productId;
                                    // Actualizar el producto en processedProducts si fue añadido sin id
                                    const idxNoId = processedProducts.findIndex(p => p.nombre === productToAdd.nombre && (!p.id || p.id === undefined));
                                    if (idxNoId !== -1) processedProducts[idxNoId].id = productId;
                                }

                                const invPayload = {
                                    stock: getFirst(change.productData, invCandidates.stock),
                                    precio_compra: getFirst(change.productData, invCandidates.precio_compra),
                                    proveedor: getFirst(change.productData, invCandidates.proveedor),
                                    notas: getFirst(change.productData, invCandidates.notas)
                                };

                                pendingInventorySaves.push({ productId, invPayload, name: productToAdd.nombre, changeId: change.id });
                                console.log(`Inventario pendiente para producto nuevo ${productToAdd.nombre} (${productId})`);
                            }
                        } catch (err) {
                            console.warn(`Error detectando inventario en producto nuevo ${change.productData && change.productData.nombre}:`, err && err.message ? err.message : err);
                        }
                        console.log(`Producto nuevo agregado: ${change.productData.nombre}`);
                    } else {
                        console.warn(`Producto duplicado detectado, saltando: ${change.productData.nombre}`);
                    }
                } else if (change.type === 'modify') {
                    // Búsqueda por nombre original o por nombre actual
                    const searchName = change.originalProductName || change.productData.nombre;
                    const index = processedProducts.findIndex(p => p.nombre === searchName);
                    
                    if (index !== -1) {
                        const productToUpdate = this.prepareProductForExport(change.productData);
                        // Conservar fecha de creación existente si la tiene
                        const existing = processedProducts[index] || {};
                        productToUpdate.created_at = productToUpdate.created_at || existing.created_at || existing.hora || null;
                        // Actualizar modified_at
                        productToUpdate.modified_at = new Date().toISOString();
                        processedProducts[index] = productToUpdate;
                        console.log(`Producto modificado: ${change.productData.nombre}`);

                        // Si el cambio contiene datos del bloque "Inventario Interno", acumularlos para guardarlos tras la subida
                        try {
                            const invCandidates = {
                                stock: ['stock', 'inventory_stock', 'inventory-stock', 'inventoryStock'],
                                precio_compra: ['precio_compra', 'inventory_precio_compra', 'inventory-precio-compra', 'inventoryPrecioCompra'],
                                proveedor: ['proveedor', 'inventory_proveedor', 'inventory-proveedor', 'inventoryProveedor'],
                                notas: ['notas', 'inventory_notas', 'inventory-notas', 'inventoryNotas']
                            };
                            const getFirst = (obj, keys) => {
                                for (const k of keys) {
                                    if (obj && obj.hasOwnProperty(k) && obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') return obj[k];
                                }
                                return null;
                            };

                            const hasInv = Object.values(invCandidates).some(keys => getFirst(change.productData, keys) !== null);
                            if (hasInv) {
                                const productId = productToUpdate.id || change.productData.id;
                                if (!productId) {
                                    console.warn('No se encontró ID para producto modificado; no se guardará inventario');
                                } else {
                                    const invPayload = {
                                        stock: getFirst(change.productData, invCandidates.stock),
                                        precio_compra: getFirst(change.productData, invCandidates.precio_compra),
                                        proveedor: getFirst(change.productData, invCandidates.proveedor),
                                        notas: getFirst(change.productData, invCandidates.notas)
                                    };

                                    pendingInventorySaves.push({ productId, invPayload, name: productToUpdate.nombre, changeId: change.id });
                                    console.log(`Inventario pendiente para producto modificado ${productToUpdate.nombre} (${productId})`);
                                }
                            }
                        } catch (err) {
                            console.warn(`Error detectando inventario en producto modificado ${change.productData && change.productData.nombre}:`, err && err.message ? err.message : err);
                        }

                        // Si se subió una nueva imagen, intentar eliminar la imagen anterior del repo
                        try {
                            if (change.hasNewImage && existing && Array.isArray(existing.imagenes) && existing.imagenes.length > 0) {
                                const oldImages = existing.imagenes.filter(n => !!n && n !== change.imageKey);
                                for (const oldImg of oldImages) {
                                    const oldPath = `${PRODUCT_CONFIG.GITHUB_API.IMAGE_PATH_PREFIX}${oldImg}`;
                                    try {
                                        await this.githubManager.deleteFileFromRepo(oldPath, `Eliminar imagen antigua ${oldImg} al modificar producto ${change.productData.nombre}`);
                                        console.log(`Imagen antigua eliminada: ${oldPath}`);
                                    } catch (err) {
                                        console.warn(`No se pudo eliminar imagen antigua ${oldImg}:`, err.message || err);
                                    }
                                }
                            }
                        } catch (err) {
                            console.warn('Error al intentar eliminar imagen anterior durante modify:', err);
                        }
                    } else {
                        console.error(`Producto no encontrado para modificar: ${searchName}`);
                        throw new Error(`No se pudo encontrar el producto "${searchName}" para modificar`);
                    }
                } else if (change.type === 'delete') {
                    // Búsqueda por nombre original o por nombre actual
                    const searchName = change.originalProductName || change.productData.nombre;
                    const index = processedProducts.findIndex(p => p.nombre === searchName);
                    
                    if (index !== -1) {
                        const prod = processedProducts[index];
                        const productId = prod.id || change.productData.id;
                        
                        // Antes de eliminar del array, intentar eliminar las imágenes asociadas en el repo
                        try {
                            if (prod && Array.isArray(prod.imagenes) && prod.imagenes.length > 0) {
                                for (const imgName of prod.imagenes) {
                                    if (!imgName) continue;
                                    const imgPath = `${PRODUCT_CONFIG.GITHUB_API.IMAGE_PATH_PREFIX}${imgName}`;
                                    try {
                                        await this.githubManager.deleteFileFromRepo(imgPath, `Eliminar imagen ${imgName} al borrar producto ${searchName}`);
                                        console.log(`Imagen eliminada: ${imgPath}`);
                                    } catch (err) {
                                        console.warn(`No se pudo eliminar imagen ${imgName}:`, err.message || err);
                                    }
                                }
                            }
                        } catch (err) {
                            console.warn('Error al intentar eliminar imágenes asociadas durante delete:', err);
                        }

                        // Acumular eliminación de inventario para ejecutarla tras subir a GitHub
                        if (productId) {
                            pendingInventorySaves.push({
                                productId,
                                invPayload: null, // null indica que es una eliminación
                                name: searchName,
                                changeId: change.id,
                                isDelete: true
                            });
                            console.log(`Eliminación de inventario pendiente para ${searchName} (${productId})`);
                        }

                        processedProducts.splice(index, 1);
                        console.log(`Producto eliminado: ${searchName}`);
                    } else {
                        console.error(`Producto no encontrado para eliminar: ${searchName}`);
                        throw new Error(`No se pudo encontrar el producto "${searchName}" para eliminar`);
                    }
                }
            }

            // 4. Convertir array final a JSON Base64
            // IMPORTANTE: Mantener la estructura exacta original { "products": [...] }
            // SANITIZAR: Asegurarse de que ningún producto contenga campos de inventario antes de exportar
            const sanitizedProducts = processedProducts.map(p => {
                try {
                    // prepareProductForExport filtra campos no permitidos y preserva id si existe
                    return this.prepareProductForExport(p);
                } catch (err) {
                    console.warn('prepareProductForExport falló para producto', p && p.id, err && err.message ? err.message : err);
                    // Fallback seguro: construir un objeto mínimo y limpio
                    return {
                        id: p && p.id ? String(p.id) : (typeof generateProductId === 'function' ? generateProductId() : undefined),
                        nombre: p && p.nombre ? String(p.nombre) : 'Sin nombre',
                        categoria: p && p.categoria ? String(p.categoria) : '',
                        precio: p && (p.precio !== undefined) ? parseFloat(p.precio) || 0 : 0,
                        descuento: p && (p.descuento !== undefined) ? parseFloat(p.descuento) || 0 : 0,
                        mas_vendido: Boolean(p && p.mas_vendido),
                        nuevo: Boolean(p && p.nuevo),
                        oferta: Boolean(p && p.oferta),
                        imagenes: Array.isArray(p && p.imagenes) ? p.imagenes : [],
                        descripcion: String((p && p.descripcion) || '').trim(),
                        disponibilidad: p && p.disponibilidad !== false,
                        created_at: p && (p.created_at || p.hora) ? (p.created_at || p.hora) : null,
                        modified_at: p && (p.modified_at || p.hora) ? (p.modified_at || p.hora) : null
                    };
                }
            });

            // Última defensa: eliminar cualquier campo 'inventory' inesperado que pueda quedar
            sanitizedProducts.forEach(p => {
                if (p && p.inventory !== undefined) {
                    console.warn('⚠️ Se eliminó campo inesperado `inventory` antes de exportar para product', p.id);
                    delete p.inventory;
                }
            });

            const fileContent = {
                products: sanitizedProducts
            };

            // Validar que la estructura es correcta antes de guardar
            if (!Array.isArray(fileContent.products)) {
                throw new Error('Error crítico: La estructura de productos no es un array válido');
            }

            // Validar que se pueden serializar correctamente
            // Preparar variable para el resultado de subida
            let uploadResult = null;

            try {
                const jsonString = JSON.stringify(fileContent, null, 2);
                
                // Re-parsear para validar integridad
                const reParsed = JSON.parse(jsonString);
                if (!reParsed.products || !Array.isArray(reParsed.products)) {
                    throw new Error('JSON no es válido después de serialización');
                }
                
                if (reParsed.products.length !== processedProducts.length) {
                    throw new Error(`Mismatch de cantidad de productos: esperaba ${processedProducts.length}, obtuve ${reParsed.products.length}`);
                }
                
                console.log(`✓ JSON validado correctamente con ${reParsed.products.length} productos`);
                console.log(`JSON (primeros 500 caracteres):`, jsonString.substring(0, 500));
                
                // Codificar a Base64 preservando UTF-8
                const encoder = new TextEncoder();
                const data = encoder.encode(jsonString);
                const base64Content = btoa(String.fromCharCode.apply(null, data));
                
                // 5. Subir archivo de productos a GitHub
                report(75, 'Subiendo archivo de productos a la base de datos...');
                uploadResult = await this.githubManager.uploadFile(
                    PRODUCT_CONFIG.GITHUB_API.PRODUCTS_FILE_PATH,
                    base64Content,
                    `Actualizar inventario - ${processedProducts.length} productos (${this.stagedChanges.length} cambios)`
                );
                
                console.log(`✓ Archivo subido a la base de datos correctamente`);
                report(95, 'Archivo de productos subido. Finalizando...');

                // 5.b Guardar inventarios pendientes (si los hay) AHORA que el archivo ya está en GitHub
                const inventorySaveSummary = { succeeded: [], failed: [], localStorageRecovered: [] };
                
                // Recuperar respaldos de inventario del localStorage (si backend no estaba disponible al crear)
                const localStorageInventories = this._getPendingInventoryFromLocalStorage();
                console.log(`📦 Recuperados ${Object.keys(localStorageInventories).length} respaldos de inventario del localStorage`);
                
                // Combinar: pendientes del staging + recuperados del localStorage
                const allInventorySaves = [
                    ...pendingInventorySaves,
                    ...Object.entries(localStorageInventories).map(([productId, invPayload]) => ({
                        productId,
                        invPayload,
                        name: processedProducts.find(p => p.id === productId)?.nombre || productId,
                        fromLocalStorage: true
                    }))
                ];
                
                if (allInventorySaves.length > 0) {
                    for (const item of allInventorySaves) {
                        try {
                            // Si invPayload es null, es una eliminación
                            if (item.isDelete) {
                                await inventoryApiClient.deleteInventory(item.productId);
                                inventorySaveSummary.succeeded.push({ productId: item.productId, name: item.name, action: 'delete' });
                                console.log(`✅ Inventario eliminado para producto ${item.name} (${item.productId})`);
                            } else {
                                const saved = await inventoryApiClient.saveInventory(item.productId, item.invPayload);
                                // Adjuntar inventario normalizado al producto en memoria
                                const idx = processedProducts.findIndex(p => p.id === item.productId);
                                if (idx !== -1) processedProducts[idx].inventory = saved;
                                
                                if (item.fromLocalStorage) {
                                    inventorySaveSummary.localStorageRecovered.push({ productId: item.productId, name: item.name });
                                    this._removeInventoryFromLocalStorage(item.productId);
                                    console.log(`✅ Inventario recuperado del localStorage y guardado para ${item.name} (${item.productId})`);
                                } else {
                                    inventorySaveSummary.succeeded.push({ productId: item.productId, name: item.name });
                                    console.log(`Inventario guardado post-upload para ${item.name} (${item.productId})`);
                                }
                            }
                        } catch (err) {
                            inventorySaveSummary.failed.push({ productId: item.productId, name: item.name, error: err && err.message ? err.message : String(err) });
                            console.warn(`No se pudo procesar inventario para ${item.name} (${item.productId}):`, err && err.message ? err.message : err);
                            // No limpiar del localStorage si falla, para reintentar después
                        }
                    }
                    console.log(`📊 Resumen inventario - Exitosos: ${inventorySaveSummary.succeeded.length} | Recuperados: ${inventorySaveSummary.localStorageRecovered.length} | Fallidos: ${inventorySaveSummary.failed.length}`);
                }
            } catch (error) {
                console.error('Error validando o serializando JSON:', error);
                throw error;
            }

            // 6. Limpiar localStorage e IndexedDB
            await this.discardAllChanges();
            this.lastSync = new Date();

            report(100, 'Sincronización completada');
            return {
                success: true,
                message: 'Todos los cambios han sido sincronizados con la base de datos',
                filesUpdated: this.stagedChanges.length + 1, // +1 por el archivo de productos
                commitSha: uploadResult?.commit?.sha || null,
                inventorySaveSummary
            };
        } catch (error) {
            console.error('Error sincronizando cambios:', error);
            throw error;
        }
    }

    /**
     * Guarda cambios en localStorage
     */
    saveStagedChanges() {
        // Solo guardar metadatos, no imágenes
        const stagedMetadata = this.stagedChanges.map(change => ({
            id: change.id,
            type: change.type,
            timestamp: change.timestamp,
            productId: change.productId,
            productData: change.productData,
            hasNewImage: change.hasNewImage,
            imageKey: change.imageKey
        }));

        localStorage.setItem('casa_fresca_staged_changes', JSON.stringify(stagedMetadata));
    }

    /**
     * Carga cambios desde localStorage
     */
    loadStagedChanges() {
        const stored = localStorage.getItem('casa_fresca_staged_changes');
        if (stored) {
            try {
                const metadata = JSON.parse(stored);
                this.stagedChanges = metadata.map(meta => ({
                    ...meta,
                    id: meta.id || `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                }));
                console.log(`${this.stagedChanges.length} cambios cargados desde localStorage`);
            } catch (error) {
                console.warn('Error cargando cambios:', error);
                this.stagedChanges = [];
            }
        }
    }

    /**
     * Obtiene URL del archivo de productos en GitHub
     * @returns {string}
     */
    getProductsFileUrl() {
        return `https://raw.githubusercontent.com/${PRODUCT_CONFIG.GITHUB_API.REPO_OWNER}/${PRODUCT_CONFIG.GITHUB_API.REPO_NAME}/${PRODUCT_CONFIG.GITHUB_API.BRANCH}/${PRODUCT_CONFIG.GITHUB_API.PRODUCTS_FILE_PATH}`;
    }

    /**
     * Obtiene URL de imagen
     * @param {string} imageName - Nombre de la imagen
     * @returns {string}
     */
    getImageUrl(imageName) {
        return `https://raw.githubusercontent.com/${PRODUCT_CONFIG.GITHUB_API.REPO_OWNER}/${PRODUCT_CONFIG.GITHUB_API.REPO_NAME}/${PRODUCT_CONFIG.GITHUB_API.BRANCH}/${PRODUCT_CONFIG.GITHUB_API.IMAGE_PATH_PREFIX}${imageName}`;
    }

    /**
     * Busca productos
     * @param {string} searchTerm
     * @returns {Array}
     */
    searchProducts(searchTerm) {
        const term = searchTerm.toLowerCase();
        return this.products.filter(p => p.searchText.includes(term));
    }

    /**
     * Filtra por categoría
     * @param {string} category
     * @returns {Array}
     */
    filterByCategory(category) {
        if (!category || category === 'todos') {
            return this.products;
        }
        return this.products.filter(p => p.categoria.toLowerCase() === category.toLowerCase());
    }

    /**
     * Obtiene todas las categorías únicas
     * @returns {Array}
     */
    getAllCategories() {
        const categories = new Set(this.products.map(p => p.categoria));
        return Array.from(categories).sort();
    }

    /**
     * Obtiene un producto por ID
     * @param {string} productId
     * @returns {Object|null}
     */
    getProductById(productId) {
        return this.products.find(p => p.id === productId) || null;
    }

    /**
     * Prepara un producto para exportar a JSON (sin campos internos)
     * @param {Object} productData - Datos del producto
     * @returns {Object} - Producto formateado para exportar
     */
    /**
     * Prepara un producto para exportar a JSON (limpia campos internos, valida tipos)
     * IMPORTANTE: Esta función SOLO exporta campos de PRODUCTO, NUNCA campos de INVENTARIO
     * @param {Object} productData - Datos del producto
     * @returns {Object} - Producto listo para guardar en JSON
     */
    prepareProductForExport(productData) {
        // Validar campos requeridos
        if (!productData.nombre || typeof productData.nombre !== 'string') {
            throw new Error('El campo "nombre" es requerido y debe ser texto');
        }
        
        if (!productData.categoria || typeof productData.categoria !== 'string') {
            throw new Error('El campo "categoria" es requerido y debe ser texto');
        }
        
        if (productData.precio === undefined || productData.precio === null) {
            throw new Error('El campo "precio" es requerido');
        }

        // SEGURIDAD: Verificar que NO hay campos de inventario siendo incluidos
        const forbiddenFields = ['stock', 'precio_compra', 'proveedor', 'notas', 'last_updated', 'inventory', 'inventory_stock', 'inventory_precio_compra', 'inventory_proveedor', 'inventory_notas'];
        const hasInventoryFields = forbiddenFields.some(field => productData.hasOwnProperty(field) && productData[field] !== undefined && productData[field] !== null);
        
        if (hasInventoryFields) {
            // Campos de inventario detectados: serán descartados automáticamente por la whitelist.
        }

        // WHITELIST: Solo estos campos se exportan a GitHub
        return {
            id: productData.id ? String(productData.id) : undefined,
            nombre: String(productData.nombre).trim(),
            categoria: String(productData.categoria).trim(),
            precio: parseFloat(productData.precio),
            descuento: parseFloat(productData.descuento || 0),
            mas_vendido: Boolean(productData.mas_vendido || false),
            nuevo: Boolean(productData.nuevo || false),
            oferta: Boolean(productData.oferta || false),
            imagenes: Array.isArray(productData.imagenes) ? productData.imagenes : [],
            descripcion: String(productData.descripcion || '').trim(),
            disponibilidad: productData.disponibilidad !== false,
            // Mantener timestamps si vienen en los datos. Si no, quedarán null
            created_at: productData.created_at || productData.hora || null,
            modified_at: productData.modified_at || productData.hora || null
        };
    }

    /**
     * Recupera todos los datos de inventario del localStorage (respaldos pendientes)
     * @private
     */
    _getPendingInventoryFromLocalStorage() {
        try {
            const pending = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('casa_fresca_inventory_')) {
                    const stored = JSON.parse(localStorage.getItem(key));
                    if (stored && !stored.synced) {
                        pending[stored.productId] = stored.inventoryData;
                    }
                }
            }
            return pending;
        } catch (err) {
            console.warn('Error recuperando inventario de localStorage:', err);
            return {};
        }
    }

    /**
     * Elimina datos de inventario del localStorage
     * @private
     */
    _removeInventoryFromLocalStorage(productId) {
        try {
            const storageKey = `casa_fresca_inventory_${productId}`;
            localStorage.removeItem(storageKey);
        } catch (err) {
            console.warn('Error eliminando del localStorage:', err);
        }
    }
}
/**
 * Renderizador de UI para el Sistema de Inventario
 * Genera HTML dinámico para productos, modales y staging panel
 */


export class InventoryUIRenderer {
    constructor(containerSelector = '#inventory-view') {
        this.container = document.querySelector(containerSelector);
        this.productManager = null;
        this.packManager = null;
        this.currentView = 'products'; // 'products' or 'packs' or 'changes'
        this.inventoryApiClient = new InventoryApiClient();
        this._backgroundInventoryFetches = new Set(); // evitar fetchs concurrentes por producto
    }

    /**
     * Normaliza valores de inventario para visualización (maneja objetos y strings JSON)
     * @private
     */
    _normalizeInventoryField(value) {
        // Reusar lógica del client si está disponible (si se exporta)
        try {
            // Si es objeto o número o booleano, extraer primitivo razonable
            if (value === null || value === undefined) return null;
            if (typeof value === 'number' || typeof value === 'boolean') return value;
            if (typeof value === 'object') {
                // buscar campos comunes
                const keys = ['value','valor','cantidad','stock','amount','precio','precio_compra','proveedor','notes','notas'];
                for (const k of keys) if (value[k] !== undefined) return this._normalizeInventoryField(value[k]);
                // si no, intentar stringify para mostrar algo útil
                try { return JSON.stringify(value); } catch (e) { return null; }
            }
            // Si es string, intentar parsear JSON
            if (typeof value === 'string') {
                const trimmed = value.trim();
                if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                    try { const parsed = JSON.parse(trimmed); return this._normalizeInventoryField(parsed); } catch (e) { /* not JSON */ }
                }
                // Si es número en string, devolver número
                const n = Number(value);
                if (!isNaN(n)) return n;
                return value;
            }
            return null;
        } catch (e) { return null; }
    }

    /**
     * Inicializa la UI del inventario
     */
    async initInventoryUI(productManager) {
        this.productManager = productManager;
        // contador de modales abiertos para controlar scroll de fondo
        this._modalOpenCount = 0;
        this.renderInventoryTemplate();
        this.setupEventListeners();

        // Modal de guardado en GitHub
        try {
            this.githubSaveModal = new GitHubSaveModal();
        } catch (e) {
            console.warn('No se pudo inicializar GitHubSaveModal', e);
            this.githubSaveModal = null;
        }

        // Estado inicial: mostrar Productos (grid visible), ocultar Cambios (staging panel hidden)
        const btnProducts = document.getElementById('btn-view-products');
        const btnPacks = document.getElementById('btn-view-packs');
        const btnChanges = document.getElementById('btn-view-changes');
        const productsGrid = document.getElementById('products-grid');
        const packsGrid = document.getElementById('packs-grid');
        const stagingPanel = document.getElementById('staging-panel');

        // Botones: Productos activo, Cambios inactivo
        if (btnProducts) btnProducts.classList.add('active');
        if (btnChanges) btnChanges.classList.remove('active');

        // Vistas: Productos visible, Cambios (panel) oculto
        if (productsGrid) productsGrid.classList.remove('hidden');
        if (stagingPanel) stagingPanel.classList.add('hidden'); // FUERZA: panel siempre inicia oculto

        // Notar: NO cargamos productos aquí para evitar doble-fetch. La carga se realiza desde InventoryApp.showInventory()
        // Sólo actualizamos UI básica y escuchamos actualizaciones parciales de inventario
        this.updateCategoryFilter();
        this.renderProductsGrid();

        // Escuchar actualizaciones parciales de inventarios y actualizar solo tarjetas afectadas
        document.addEventListener('inventories:updated', (e) => {
            try {
                const ids = (e && e.detail && Array.isArray(e.detail.ids)) ? e.detail.ids : [];
                console.log('📣 Inventories updated:', ids.length ? `${ids.length} ids` : 'ids not provided');
                if (!ids || ids.length === 0) {
                    // Si no hay ids, re-renderizar por seguridad
                    return this.renderProductsGrid();
                }

                // Actualizar solo las tarjetas correspondientes
                ids.forEach(id => {
                    try {
                        const payloads = (e && e.detail && e.detail.payloads) ? e.detail.payloads : null;
                        const payload = payloads && payloads[id] ? payloads[id] : null;

                        const product = this.productManager.getProductById ? this.productManager.getProductById(id) : null;
                        const card = document.querySelector(`.product-card[data-product-id="${id}"]`);
                        if (!card) return;

                        const stockEl = card.querySelector('.product-inventory-stock');
                        const precioEl = card.querySelector('.product-inventory-precio');

                        if (payload) {
                            // Si viene payload con datos normalizados, usarlo y actualizar productManager si existe
                            const stockVal = (payload.stock !== undefined && payload.stock !== null) ? payload.stock : (payload.quantity ?? null);
                            const precioVal = payload.precio_compra ?? payload.price ?? null;

                            if (product) {
                                product.inventory = payload;
                                product.stock = (stockVal !== null && stockVal !== undefined) ? stockVal : product.stock;
                                product.precio_compra = (precioVal !== null && precioVal !== undefined) ? precioVal : product.precio_compra;
                            }

                            if (stockEl) stockEl.textContent = `Stock: ${stockVal !== null && stockVal !== undefined ? stockVal : '—'}`;
                            if (precioEl) precioEl.textContent = `Costo: ${precioVal !== null && precioVal !== undefined ? `$${(parseFloat(precioVal)||0).toFixed(2)}` : '—'}`;

                            if (payload.hasData) card.classList.add('has-inventory-data'); else card.classList.remove('has-inventory-data');

                        } else if (product) {
                            const stockText = (product.stock !== null && product.stock !== undefined) ? product.stock : '—';
                            const precioText = (product.precio_compra !== null && product.precio_compra !== undefined) ? `$${(parseFloat(product.precio_compra)||0).toFixed(2)}` : '—';

                            if (stockEl) stockEl.textContent = `Stock: ${stockText}`;
                            if (precioEl) precioEl.textContent = `Costo: ${precioText}`;

                            if (product.inventory && product.inventory.hasData) {
                                card.classList.add('has-inventory-data');
                            } else {
                                card.classList.remove('has-inventory-data');
                            }
                        } else {
                            if (stockEl) stockEl.textContent = 'Stock: —';
                            if (precioEl) precioEl.textContent = 'Costo: —';
                        }
                    } catch (err) { /* ignore individual card failures */ }
                });
            } catch (err) {
                console.warn('Error al procesar evento inventories:updated', err);
            }
        });

        // Actualizar contenido y badge del panel de staging (SIN cambiar su visibilidad)
        this.updateStagingPanel();
    }

    /**
     * Renderiza el template principal del inventario
     */
    renderInventoryTemplate() {
        this.container.innerHTML = `
            <div class="inventory-header">
                <h2><i class="fas fa-boxes"></i> Gestión de Inventario</h2>
                <div class="inventory-actions">
                    <div class="inventory-view-toggle">
                        <button class="btn btn-outline active" id="btn-view-products">Productos</button>
                        <!-- <button class="btn btn-outline" id="btn-view-packs">Packs</button> -->
                        <button class="btn btn-outline" id="btn-view-changes">Cambios</button>
                    </div>

                    <button class="btn btn-primary" id="btn-add-product">
                        <i class="fas fa-plus"></i> Nuevo Producto
                    </button>
                    <button class="btn btn-outline" id="btn-manage-repo-images">
                        <i class="fas fa-images"></i> Imágenes Repo
                    </button>
                    <button class="btn btn-secondary" id="btn-refresh-products">
                        <i class="fas fa-sync-alt"></i> Recargar
                    </button>
                </div>
            </div>

            <!-- Panel de Staging -->
            <div class="staging-panel hidden" id="staging-panel">
                <div class="staging-header">
                    <div class="staging-title">
                        <i class="fas fa-code-branch"></i>
                        <span>Cambios Pendientes en Staging</span>
                    </div>
                </div>

                <div class="staging-stats" id="staging-stats"></div>

                <!-- Las pestañas se crean dinámicamente -->
                <!-- staging-tabs, staging-tab-content se insertan aquí -->

                <div class="staging-actions">
                    <button class="btn-discard-all" id="btn-discard-all">
                        <i class="fas fa-trash"></i> Descartar Todos
                    </button>
                    <button class="btn-sync-github" id="btn-sync-github">
                        <i class="fas fa-cloud-upload-alt"></i> Sincronizar con Base de Datos
                    </button>
                </div>
            </div>

            <!-- Toolbar -->
            <div class="inventory-toolbar">
                <div class="search-box">
                    <i class="fas fa-search"></i>
                    <input type="text" id="search-products" placeholder="Buscar productos..." autocomplete="off" autocapitalize="off" spellcheck="false">
                </div>
                <div class="filter-controls">
                    <select class="filter-select" id="filter-category">
                        <option value="">Todas las categorías</option>
                    </select>

                    <select class="filter-select" id="filter-modified">
                        <option value="all">Todos</option>
                        <option value="modified">Solo Modificados</option>
                        <option value="new">Solo Nuevos</option>
                    </select>

                    <select class="filter-select" id="sort-products">
                        <option value="default">Orden: Predeterminado</option>
                        <option value="price_desc">Precio ↓</option>
                        <option value="price_asc">Precio ↑</option>
                        <option value="date_modified">Últ. Modificación</option>
                        <option value="date_created">Fecha Creación</option>
                    </select>

                    <button class="btn btn-outline" id="btn-export-csv">Exportar CSV</button>
                    <button class="btn btn-outline" id="btn-clear-filters">Limpiar filtros</button>
                </div>

                <div class="toolbar-stats" id="toolbar-stats">
                    <div class="stat small" id="stat-total">Total: 0</div>
                    <div class="stat small" id="stat-available">Disponibles: 0</div>
                    <div class="stat small" id="stat-unavailable">No disponibles: 0</div>
                    <div class="stat small" id="stat-modified-count">Modificados: 0</div>
                    <div class="stat small" id="stat-packs-sep">|</div>
                    <div class="stat small" id="stat-packs-total">Packs: 0</div>
                    <div class="stat small" id="stat-packs-available">P.Disponibles: 0</div>
                    <div class="stat small" id="stat-packs-modified">P.Modificados: 0</div>
                </div>
            </div>

            <!-- Grid de Productos -->
            <div class="products-grid" id="products-grid">
                <div class="empty-state">
                    <i class="fas fa-spinner-third"></i>
                    <p>Cargando productos...</p>
                </div>
            </div>
            <div class="products-grid hidden" id="packs-grid">
                <div class="empty-state">
                    <i class="fas fa-spinner-third"></i>
                    <p>Cargando packs...</p>
                </div>
            </div>
        `;

        // Agregar estilos si no existen
        if (!document.querySelector('link[href*="inventory.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'Css/inventory.css';
            document.head.appendChild(link);
        }
        if (!document.querySelector('link[href*="packs.css"]')) {
            const link2 = document.createElement('link');
            link2.rel = 'stylesheet';
            link2.href = 'Css/packs.css';
            document.head.appendChild(link2);
        }
    }

    /**
     * Renderiza la grid de productos
     */
    renderProductsGrid(products = null) {
        const grid = document.getElementById('products-grid');
        const productsToRender = products || this.productManager.products;

        if (!grid) return;

        if (productsToRender.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>No hay productos para mostrar</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = productsToRender.map(product => this.createProductCard(product)).join('');

        // Event listeners para acciones de productos
        grid.querySelectorAll('.btn-product-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = btn.dataset.productId;
                this.openProductModal(productId, 'edit');
            });
        });

        grid.querySelectorAll('.btn-product-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const productId = btn.dataset.productId;
                const product = this.productManager.getProductById(productId);
                if (!product) return;
                
                // Mostrar previsualización del producto a eliminar
                const ok = await this.showDeleteProductPreview(product);
                if (ok) this.handleDeleteProduct(productId);
            });
        });

        // Aplicar previews de imágenes almacenadas en staging (si existen)
        this.applyStagedImagesToGrid();

        // Completar tamaños de imagen (no bloqueante)
        try { this.populateProductImageSizes(); } catch (e) { console.warn('populateProductImageSizes call error', e); }

        // Actualizar estadísticas del toolbar
        try { this.updateToolbarStats(); } catch (e) { console.warn('updateToolbarStats error', e); }
        
        // Setup listeners para abrir imagen en modal al hacer clic
        try { this.setupProductImageModalListeners(); } catch (e) { console.warn('setupProductImageModalListeners error', e); }
    }

    /**
     * Crea el HTML de una tarjeta de producto
     */
    createProductCard(product) {
        const discount = product.descuento ? `<span class="product-price-original">$${product.precio.toFixed(2)}</span>` : '';
        const isModified = this.productManager.getStagedChanges().some(c => c.productId === product.id && c.type === 'modify');
        const isDeleted = this.productManager.getStagedChanges().some(c => c.productId === product.id && c.type === 'delete');

        // Lógica de Badge de Stock
        const stockVal = product.stock !== null && product.stock !== undefined ? Number(product.stock) : null;
        let stockBadge = '';
        if (stockVal !== null) {
            if (stockVal === 0) {
                stockBadge = '<span class="product-badge stock-out">Sin Stock</span>';
            } else if (stockVal < 5) {
                stockBadge = '<span class="product-badge stock-low">Bajo Stock</span>';
            } else if (stockVal < 20) {
                stockBadge = '<span class="product-badge stock-medium">Stock Medio</span>';
            } else {
                stockBadge = '<span class="product-badge stock-high">Stock Alto</span>';
            }
        }

        // Mostrar both created_at y modified_at si existen (o marcador si null)
        let dateHtml = '';
        try {
            const createdStr = product.created_at ? formatDate(new Date(product.created_at)) : '—';
            const modifiedStr = product.modified_at ? formatDate(new Date(product.modified_at)) : '—';
            dateHtml = `
                <div class="product-meta">
                    <small>Creado: ${createdStr}</small><br>
                    <small>Última modificación: ${modifiedStr}</small>
                    ${stockBadge}
                </div>
            `;
        } catch (e) {
            dateHtml = '';
        }
        return `
            <div class="product-card ${isModified ? 'modified' : ''} ${isDeleted ? 'deleted' : ''}" data-product-id="${product.id}">
                <div class="product-image">
                        <div class="contenedor-imagen">
                        ${product.disponibilidad === false ? '<span class="product-badge unavailable">No disponible</span>' : ''}
                        <div class="product-image-size" data-src="${product.imagenUrl}"></div>
                        <img src="${product.imagenUrl}" alt="${product.nombre}" onerror="this.src='Img/no_image.jpg'">
                        
                        ${product.nuevo ? '<span class="product-badge new">Nuevo</span>' : ''}
                        ${product.oferta ? '<span class="product-badge sale">Oferta</span>' : ''}
                        ${isModified ? '<span class="product-badge modified">Modificado</span>' : ''}
                        ${isDeleted ? '<span class="product-badge deleted">Eliminado</span>' : ''}
                    </div>
                </div>
                <div class="product-info">
                    <div class="product-name">${product.nombre}</div>
                    <div class="product-category">${product.categoria}</div>
                    <div class="product-description">${product.descripcion || 'Sin descripción'}</div>
                    ${dateHtml}
                    <div class="product-footer">
                        <div class="product-price">
                            <div class="product-price-final">$${product.precioFinal.toFixed(2)}</div>
                            ${discount}
                        </div>
                        
                        <div class="product-actions">
                            <button class="btn-product-edit" data-product-id="${product.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-product-delete" data-product-id="${product.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza la grid de packs
     */
    renderPacksGrid(packs = null) {
        const grid = document.getElementById('packs-grid');
        const packsToRender = packs || (this.packManager ? this.packManager.packs : []);

        if (!grid) return;

        if (!packsToRender || packsToRender.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>No hay packs para mostrar</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = packsToRender.map(pack => this.createPackCard(pack)).join('');

        // Event listeners
        grid.querySelectorAll('.btn-pack-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const packId = btn.dataset.packId;
                this.openPackModal(packId, 'edit');
            });
        });

        grid.querySelectorAll('.btn-pack-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const packId = btn.dataset.packId;
                const ok = await this.showConfirmDialog('¿Estás seguro de que deseas eliminar este pack?');
                if (ok) this.handleDeletePack(packId);
            });
        });
        // Actualizar métricas del toolbar
        try { this.updateToolbarStats(); } catch (e) { console.warn('updateToolbarStats error', e); }
    }

    createPackCard(pack) {
        const discount = pack.descuento ? `<span class="product-price-original">$${pack.precio.toFixed(2)}</span>` : '';
        const staged = this.packManager ? this.packManager.getStagedChanges() : [];
        const isModified = staged && staged.some(c => c.packId === pack.id && c.type === 'modify');
        const isDeleted = staged && staged.some(c => c.packId === pack.id && c.type === 'delete');
        let features = '';
        if (Array.isArray(pack.caracteristicas)) {
            features = `<ul class="pack-features">${pack.caracteristicas.map(f => `<li>${f}</li>`).join('')}</ul>`;
        }

        const createdStr = pack.created_at ? formatDate(new Date(pack.created_at)) : '—';
        const modifiedStr = pack.modified_at ? formatDate(new Date(pack.modified_at)) : '—';

        return `
            <div class="pack-card ${isModified ? 'modified' : ''} ${isDeleted ? 'deleted' : ''}" data-pack-id="${pack.id}">
                <div class="pack-image">
                    <div class="pack-image-size" data-src="${pack.imagenUrl}"></div>
                    <img src="${pack.imagenUrl}" alt="${pack.nombre}" onerror="this.src='Img/no_image.jpg'">
                    ${pack.nuevo ? '<span class="pack-badge new">Nuevo</span>' : ''}
                    ${pack.oferta ? '<span class="pack-badge sale">Oferta</span>' : ''}
                    ${isModified ? '<span class="pack-badge modified">Modificado</span>' : ''}
                    ${isDeleted ? '<span class="pack-badge deleted">Eliminado</span>' : ''}
                </div>
                <div class="pack-info">
                    <div class="pack-name">${pack.nombre}</div>
                    <div class="pack-category">${pack.categoria || ''}</div>
                    <div class="pack-description">${pack.descripcion || 'Sin descripción'}</div>
                    <div class="pack-meta"><small>Creado: ${createdStr}</small><br><small>Últ. modificación: ${modifiedStr}</small></div>
                    ${features}
                    <div class="pack-footer">
                        <div class="pack-price">
                            <div class="pack-price-final">$${pack.precioFinal.toFixed(2)}</div>
                            ${discount}
                        </div>
                        <div class="pack-actions">
                            <button class="btn-pack-edit" data-pack-id="${pack.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-pack-delete" data-pack-id="${pack.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Actualiza el panel de staging (SOLO contenido, NO visibilidad)
     * La visibilidad es controlada ÚNICAMENTE por los botones Productos/Cambios
     */
    updateStagingPanel() {
        const panel = document.getElementById('staging-panel');
        const statsA = this.productManager ? this.productManager.getStagingStats() : { total:0,new:0,modify:0,delete:0,withImages:0 };
        const statsB = this.packManager ? this.packManager.getStagingStats() : { total:0,new:0,modify:0,delete:0,withImages:0 };
        const stats = {
            total: (statsA.total || 0) + (statsB.total || 0),
            new: (statsA.new || 0) + (statsB.new || 0),
            modify: (statsA.modify || 0) + (statsB.modify || 0),
            delete: (statsA.delete || 0) + (statsB.delete || 0),
            withImages: (statsA.withImages || 0) + (statsB.withImages || 0)
        };


        // Actualizar badge en la cabecera
        const headerChangesBtn = document.getElementById('btn-view-changes');
        if (headerChangesBtn) {
            let badge = headerChangesBtn.querySelector('.header-changes-badge');
            if (stats.total > 0) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'header-changes-badge';
                    headerChangesBtn.appendChild(badge);
                }
                badge.textContent = stats.total;
            } else if (badge) {
                badge.remove();
            }
        }

        // Limpiar lista anterior
        const existingList = panel.querySelector('.staging-changes-simple');
        if (existingList) existingList.remove();
        const existingEmpty = panel.querySelector('.staging-empty-message');
        if (existingEmpty) existingEmpty.remove();

        // Si no hay cambios, mostrar mensaje vacío y ocultar acciones
        const actions = panel.querySelector('.staging-actions');
        if (stats.total === 0) {
            // Mostrar estadísticas (principalmente imagenes)
            document.getElementById('staging-stats').innerHTML = `
                <div class="stat-badge images">
                    <i class="fas fa-image"></i>
                    <span>${stats.withImages} Con imagen${stats.withImages !== 1 ? 's' : ''}</span>
                </div>
            `;

            // Mensaje vacío más informativo
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'staging-empty-message';
            emptyMsg.style.padding = '1rem';
            emptyMsg.style.color = '#7f8c8d';
            emptyMsg.textContent = 'No hay cambios en staging — crea o edita productos o packs para verlos aquí.';

            if (actions) {
                actions.insertAdjacentElement('beforebegin', emptyMsg);
                actions.style.display = 'none';
            }

            return;
        } else {
            if (actions) actions.style.display = '';
        }

        // Actualizar estadísticas
        const statsHtml = `
            <div class="stat-badge new">
                <i class="fas fa-plus-circle"></i>
                <span>${stats.new} Nuevo${stats.new !== 1 ? 's' : ''}</span>
            </div>
            <div class="stat-badge modify">
                <i class="fas fa-edit"></i>
                <span>${stats.modify} Modificado${stats.modify !== 1 ? 's' : ''}</span>
            </div>
            <div class="stat-badge delete">
                <i class="fas fa-trash"></i>
                <span>${stats.delete} Eliminado${stats.delete !== 1 ? 's' : ''}</span>
            </div>
            <div class="stat-badge images">
                <i class="fas fa-image"></i>
                <span>${stats.withImages} Con imagen${stats.withImages !== 1 ? 's' : ''}</span>
            </div>
        `;

        document.getElementById('staging-stats').innerHTML = statsHtml;

        // Renderizar cambios
        this.renderStagedChanges();
    }

    /**
     * Renderiza la lista de cambios en staging (SIN TABS)
     */
    renderStagedChanges() {
        const stagingPanel = document.getElementById('staging-panel');
        if (!stagingPanel) return;

        const changesProd = this.productManager ? this.productManager.getStagedChanges().map(c => ({...c, kind: 'product'})) : [];
        const changesPacks = this.packManager ? this.packManager.getStagedChanges().map(c => ({...c, kind: 'pack'})) : [];
        const changes = [...changesProd, ...changesPacks];

        // Si no hay cambios, no renderizar nada (el panel ya muestra "Sin cambios")
        if (changes.length === 0) {
            return;
        }

        // Limpiar lista anterior
        const existingList = stagingPanel.querySelector('.staging-changes-simple');
        if (existingList) existingList.remove();

        // Construir HTML de cambios
        const changesHTML = changes.map(change => `
            <div class="change-item ${change.type} " data-change-id="${change.id}">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <span class="change-type ${change.type}">
                        <i class="fas ${this.getChangeIcon(change.type)}"></i>
                        ${change.type.charAt(0).toUpperCase() + change.type.slice(1)} ${change.kind === 'pack' ? '(Pack)' : ''}
                    </span>
                    <div class="change-product-name">${change.productData.nombre}</div>
                    <div style="margin-left:auto; color:#7f8c8d; font-size:0.85rem;">
                        ${change.timestamp ? formatDate(new Date(change.timestamp)) : ''}
                    </div>
                    ${change.hasNewImage ? '<i class="fas fa-image" style="color: #3498db; font-size: 0.9rem;"></i>' : ''}
                </div>
                <div class="change-actions">
                    <button class="btn-view-change" data-change-id="${change.id}"><i class="fas fa-eye"></i> Ver</button>
                    ${change.type === 'modify' ? `<button class="btn-edit-change" data-change-id="${change.id}"><i class="fas fa-pen"></i> Editar</button>` : ''}
                    <button class="btn-discard-change" data-change-id="${change.id}">
                        <i class="fas fa-times"></i> Descartar
                    </button>
                </div>
                <div class="change-preview" id="change-preview-${change.id}" style="display:none; margin-top:0.5rem; padding:0.75rem; border:1px solid #eee; border-radius:4px;">
                    <div style="display:flex; gap:0.75rem; align-items:flex-start;">
                        <div style="flex:1;">
                            <div><strong>Categoría:</strong> ${change.productData.categoria || '—'}</div>
                            <div><strong>Precio:</strong> $${change.productData.precio || '—'}</div>
                            <div><strong>Descuento:</strong> ${change.productData.descuento || 0}%</div>
                            <div><strong>Oferta:</strong> ${change.productData.oferta ? 'Sí' : 'No'}</div>
                            <div style="margin-top:0.5rem;"><strong>Descripción:</strong><div>${change.productData.descripcion || '—'}</div></div>
                        </div>
                        <div style="width:120px;">
                            <div id="change-preview-img-${change.id}"></div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Crear contenedor y agregar HTML
        const changesContent = `<div id="staging-changes-list" class="staging-changes-simple">${changesHTML}</div>`;

        // Insertar cambios después del stats
        const statsDiv = stagingPanel.querySelector('.staging-stats');
        if (statsDiv) {
            statsDiv.insertAdjacentHTML('afterend', changesContent);
        }

        // Event listeners para Ver previews
        const changesList = stagingPanel.querySelector('#staging-changes-list');
        if (changesList) {
            changesList.querySelectorAll('.btn-view-change').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = btn.dataset.changeId;
                    const preview = document.getElementById(`change-preview-${id}`);
                    if (!preview) return;
                    preview.style.display = preview.style.display === 'none' ? 'block' : 'none';

                    // Buscar el cambio en productManager o packManager
                    let change = this.productManager ? this.productManager.getStagedChanges().find(c => c.id === id) : null;
                    let manager = this.productManager;
                    if (!change && this.packManager) {
                        change = this.packManager.getStagedChanges().find(c => c.id === id);
                        manager = this.packManager;
                    }
                    if (!change) return;

                    const imgContainer = document.getElementById(`change-preview-img-${id}`);
                    if (!imgContainer) return;

                    imgContainer.innerHTML = '';

                    if (change.hasNewImage && change.imageKey) {
                        try {
                            const img = await manager.stagingDB.getImageFromIDB(change.imageKey);
                            if (img && img.base64) {
                                const src = base64ToDataURL(img.base64, img.mimeType || 'image/jpeg');
                                imgContainer.innerHTML = `<img src="${src}" style="max-width:100%; border-radius:4px; border:1px solid #ddd;">`;
                            }
                        } catch (err) {
                            console.warn('No se pudo cargar imagen:', err);
                        }
                    } else if (change.productData.imagenes && change.productData.imagenes.length > 0) {
                        const imgName = change.productData.imagenes[0];
                        try {
                            const src = imgName.startsWith('http') ? imgName : manager.getImageUrl(imgName);
                            imgContainer.innerHTML = `<img src="${src}" style="max-width:100%; border-radius:4px; border:1px solid #ddd;">`;
                        } catch (err) {
                            console.warn('No se pudo cargar URL:', err);
                        }
                    }
                });
            });

            // Descartar cambio
            changesList.querySelectorAll('.btn-discard-change').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = btn.dataset.changeId;
                    try {
                        await this.handleDiscardChange(id);
                    } catch (error) {
                        this.showNotification(`Error: ${error.message}`, 'error');
                    }
                });
            });

            // Editar cambio (reabrir modal pre-llenado)
            changesList.querySelectorAll('.btn-edit-change').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = btn.dataset.changeId;
                    try {
                        await this.handleEditChange(id);
                    } catch (error) {
                        this.showNotification(`Error: ${error.message}`, 'error');
                    }
                });
            });
        }
    }

    /**
     * Obtiene el icono según el tipo de cambio
     */
    getChangeIcon(type) {
        switch (type) {
            case 'new': return 'fa-plus-circle';
            case 'modify': return 'fa-edit';
            case 'delete': return 'fa-trash';
            default: return 'fa-circle';
        }
    }

    /**
     * Abre modal de producto (crear/editar)
     */
    openProductModal(productId = null, mode = 'create') {
        const product = mode === 'edit' ? this.productManager.getProductById(productId) : null;
        const title = mode === 'edit' ? `Editar: ${product.nombre}` : 'Nuevo Producto';

        const categories = this.productManager.getAllCategories();
        const categoryOptions = categories.map(cat => `<option value="${cat}" ${product?.categoria === cat ? 'selected' : ''}>${cat}</option>`).join('');

        const modalHTML = `
            <div class="modal-overlay active" id="product-modal-overlay">
                <div class="product-modal" id="product-modal">
                    <div class="modal-header">
                        <h3 class="modal-title">${title}</h3>
                    </div>

                    <div class="modal-content">
                        <form id="product-form">
                            <div class="form-group">
                                <label for="product-name-input">Nombre del Producto *</label>
                                <input id="product-name-input" type="text" name="nombre" value="${product?.nombre || ''}" required>
                            </div>

                            <div class="form-group">
                                <label for="product-category-select">Categoría *</label>
                                <select id="product-category-select" name="categoria" required>
                                    <option value="">Seleccionar categoría</option>
                                    ${categoryOptions}
                                </select>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                <div class="form-group">
                                    <label for="input-precio-original">Precio Original *</label>
                                    <input type="number" id="input-precio-original" name="precio" value="${product?.precio || ''}" step="0.01" min="0" required>
                                </div>

                                <div class="form-group">
                                    <label for="input-precio-final">Precio Final Deseado</label>
                                    <input id="input-precio-final" type="number" name="precio_final_deseado" value="${product?.precioFinal || ''}" step="0.01" min="0" placeholder="Ingresa el precio final deseado">
                                </div>
                            </div>

                            <div class="form-group" style="display: none;">
                                <input type="hidden" name="descuento" id="input-descuento" value="${product?.descuento || 0}">
                            </div>

                            <div class="form-group">
                                <label for="input-descripcion">Descripción</label>
                                <textarea id="input-descripcion" name="descripcion" maxlength="500">${product?.descripcion || ''}</textarea>
                            </div>

                            <div class="form-group">
                                <label>
                                    <input type="checkbox" name="disponibilidad" ${product?.disponibilidad !== false ? 'checked' : ''}>
                                    Disponible
                                </label>
                            </div>

                            <div class="form-group">
                                <label>
                                    <input type="checkbox" name="nuevo" ${product?.nuevo ? 'checked' : ''}>
                                    Marcar como Nuevo
                                </label>
                            </div>

                            <div class="form-group">
                                <label>
                                    <input type="checkbox" name="oferta" ${product?.oferta ? 'checked' : ''}>
                                    Marcar como Oferta
                                </label>
                            </div>

                            <div class="form-group">
                                <label>
                                    <input type="checkbox" name="mas_vendido" ${product?.mas_vendido ? 'checked' : ''}>
                                    Marcar como Más Vendido
                                </label>
                            </div>

                            <div class="image-upload-group">
                                <label for="image-upload-input" class="image-upload-label">Imagen del Producto</label>
                                <div class="image-upload-area" id="image-upload-area">
                                    <i class="fas fa-cloud-upload-alt"></i>
                                    <div class="image-upload-text">
                                        Arrastra una imagen aquí o haz clic para seleccionar
                                    </div>
                                </div>
                                <input type="file" id="image-upload-input" class="image-upload-input" accept="image/*">
                                <div class="image-preview" id="image-preview"></div>
                            </div>

                            ${product?.imagenUrl && product.imagenUrl !== 'Img/no_image.jpg' ? `
                                <div class="form-group">
                                    <div class="form-label">Imagen actual</div>
                                    <div style="margin-top: 0.5rem;">
                                        <img src="${product.imagenUrl}" alt="Imagen actual" style="max-width: 150px; max-height: 150px; border-radius: 0.3rem; border: 1px solid #ddd;">
                                    </div>
                                </div>
                            ` : ''}
                        </form>
                    </div>

                    <div class="form-actions">
                        <button class="btn-form-cancel" id="btn-modal-cancel">Cancelar</button>
                        <button class="btn-form-submit" id="btn-modal-submit">
                            ${mode === 'edit' ? 'Actualizar Producto' : 'Crear Producto'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Remover modal anterior si existe
        const oldModal = document.getElementById('product-modal-overlay');
        if (oldModal) oldModal.remove();

        // Agregar modal al DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Evitar scroll del fondo mientras el modal está abierto
        this.disableBodyScroll();

        // Setup event listeners del modal
        this.setupModalListeners(mode, productId);
    }

    /**
     * Abre modal de pack (crear/editar)
     */
    openPackModal(packId = null, mode = 'create') {
        const pack = mode === 'edit' && this.packManager ? this.packManager.getPackById(packId) : null;
        const title = mode === 'edit' ? `Editar: ${pack.nombre}` : 'Nuevo Pack';

        const featuresText = pack && Array.isArray(pack.caracteristicas) ? pack.caracteristicas.join('\n') : '';

        const modalHTML = `
            <div class="modal-overlay active" id="pack-modal-overlay">
                <div class="product-modal" id="pack-modal">
                    <div class="modal-header"><h3 class="modal-title">${title}</h3></div>
                    <div class="modal-content">
                        <form id="pack-form">
                            <div class="form-group">
                                <label>Nombre del Pack *</label>
                                <input type="text" name="nombre" value="${pack?.nombre || ''}" required>
                            </div>
                            <div class="form-group">
                                <label>Precio</label>
                                <input id="input-pack-precio-original" type="number" name="precio" value="${pack?.precio || ''}" step="0.01" min="0">
                            </div>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
                                <div class="form-group">
                                    <label>Descuento (ingresa el precio final deseado)</label>
                                    <input id="input-pack-descuento" type="number" name="precio_final_deseado" value="${pack?.precioFinal || ''}" step="0.01" min="0" placeholder="Ej: 19.99">
                                </div>
                                <div class="form-group">
                                    <label>Disponible</label>
                                    <br>
                                    <label><input type="checkbox" name="disponible" ${pack?.disponible !== false ? 'checked' : ''}> Disponible</label>
                                </div>
                            </div>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
                                <div class="form-group"><label><input type="checkbox" name="top" ${pack?.top ? 'checked' : ''}> Top</label></div>
                                <div class="form-group"><label><input type="checkbox" name="nuevo" ${pack?.nuevo ? 'checked' : ''}> Nuevo</label></div>
                            </div>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
                                <div class="form-group"><label><input type="checkbox" name="oferta" ${pack?.oferta ? 'checked' : ''}> Oferta</label></div>
                                <div class="form-group"><!-- placeholder --></div>
                            </div>
                            <div class="form-group">
                                <label>Descripción</label>
                                <textarea name="descripcion">${pack?.descripcion || ''}</textarea>
                            </div>
                            <div class="form-group">
                                <label>Características / Productos del Pack (una por línea)</label>
                                <div style="display:flex; gap:0.5rem; margin-bottom:0.5rem; align-items:center;">
                                    <input id="pack-feature-input" list="pack-product-list" placeholder="Ej: x1 Arroz 1kg" style="flex:1; padding:0.5rem; border:1px solid #e6eef6; border-radius:6px;">
                                    <datalist id="pack-product-list">
                                        ${ (this.productManager && Array.isArray(this.productManager.products)) ? this.productManager.products.map(p=>`<option value="x1 ${p.nombre}"></option>`).join('') : '' }
                                    </datalist>
                                    <button type="button" id="btn-add-feature" class="btn">Agregar</button>
                                </div>
                                <textarea id="pack-features-textarea" name="caracteristicas" placeholder="Ejemplo:\nx1 Producto A\nx2 Algo más\nx3 Algo más">${featuresText}</textarea>
                            </div>
                            <div class="image-upload-group">
                                <label class="image-upload-label">Imagen del Pack</label>
                                <div class="image-upload-area" id="pack-image-upload-area">
                                    <i class="fas fa-cloud-upload-alt"></i>
                                    <div class="image-upload-text">Arrastra una imagen aquí o haz clic para seleccionar</div>
                                </div>
                                <input type="file" id="pack-image-upload-input" class="image-upload-input" accept="image/*">
                                <div class="image-preview" id="pack-image-preview"></div>
                                ${pack?.imagenUrl ? `
                                    <div class="form-group">
                                        <div class="form-label">Imagen actual</div>
                                        <div style="margin-top:0.5rem;"><img src="${pack.imagenUrl}" style="max-width:150px; border:1px solid #ddd; border-radius:4px;"></div>
                                    </div>
                                ` : ''}
                            </div>
                            <div class="form-group">
                                <label>Metadatos</label>
                                <div style="font-size:0.85rem; color:#666;">
                                    <div>Creado: ${pack?.created_at ? formatDate(new Date(pack.created_at)) : '—'}</div>
                                    <div>Última modificación: ${pack?.modified_at ? formatDate(new Date(pack.modified_at)) : '—'}</div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="form-actions">
                        <button class="btn-form-cancel" id="btn-pack-modal-cancel">Cancelar</button>
                        <button class="btn-form-submit" id="btn-pack-modal-submit">${mode === 'edit' ? 'Actualizar Pack' : 'Crear Pack'}</button>
                    </div>
                </div>
            </div>
        `;

        const old = document.getElementById('pack-modal-overlay'); if (old) old.remove();
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        // Evitar scroll del fondo mientras el modal está abierto
        this.disableBodyScroll();

        // Setup listeners simple: reuse product modal handlers pattern but custom for packs
        const overlay = document.getElementById('pack-modal-overlay');
        const form = document.getElementById('pack-form');
        const cancelBtn = document.getElementById('btn-pack-modal-cancel');
        const submitBtn = document.getElementById('btn-pack-modal-submit');
        const imageArea = document.getElementById('pack-image-upload-area');
        const imageInput = document.getElementById('pack-image-upload-input');
        const preview = document.getElementById('pack-image-preview');
        let selectedImage = null;

        const closeModal = () => { const o = document.getElementById('pack-modal-overlay'); if (o) o.remove(); this.enableBodyScroll(); };
        cancelBtn.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

        imageArea.addEventListener('click', () => imageInput.click());
        imageArea.addEventListener('dragover', (e) => { e.preventDefault(); imageArea.classList.add('dragover'); });
        imageArea.addEventListener('dragleave', () => imageArea.classList.remove('dragover'));
        imageArea.addEventListener('drop', (e) => { e.preventDefault(); imageArea.classList.remove('dragover'); const files = e.dataTransfer.files; if (files.length) { selectedImage = files[0]; this.updatePackImagePreview(selectedImage); } });
        imageInput.addEventListener('change', (e) => { if (e.target.files.length) { selectedImage = e.target.files[0]; this.updatePackImagePreview(selectedImage); } });

        // Helper to add feature/product lines into the textarea
        const featureInput = document.getElementById('pack-feature-input');
        const addFeatureBtn = document.getElementById('btn-add-feature');
        const featuresTextarea = document.getElementById('pack-features-textarea');
        if (addFeatureBtn && featureInput && featuresTextarea) {
            addFeatureBtn.addEventListener('click', () => {
                const v = featureInput.value && featureInput.value.trim();
                if (!v) return;
                featuresTextarea.value = (featuresTextarea.value ? featuresTextarea.value + '\n' : '') + v;
                featureInput.value = '';
            });
            featureInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addFeatureBtn.click(); } });
        }

        // Cálculo automático: el campo 'precio_final_deseado' (input-pack-descuento) se usa
        // para ingresar el precio final que desea el usuario; calculamos el porcentaje
        // de descuento antes de enviar el formulario.
        const precioOriginalInput = document.getElementById('input-pack-precio-original');
        const descuentoInput = document.getElementById('input-pack-descuento');

        const calcularDescuentoPack = () => {
            const precioOriginal = parseFloat(precioOriginalInput?.value) || 0;
            const precioDeseado = parseFloat(descuentoInput?.value) || 0;
            if (precioOriginal > 0 && precioDeseado > 0) {
                if (precioDeseado > precioOriginal) {
                        this.showNotification('El precio final no puede ser mayor al precio original', 'error');
                    descuentoInput.value = '';
                    return;
                }
                const descuentoPorcentaje = ((precioOriginal - precioDeseado) / precioOriginal) * 100;
                // Guardamos el porcentaje calculado como atributo data en el input para poder
                // usarlo en el submit handler.
                descuentoInput.dataset.calculated = parseFloat(descuentoPorcentaje.toFixed(2));
            } else {
                descuentoInput.dataset.calculated = '0';
            }
        };

        if (precioOriginalInput) precioOriginalInput.addEventListener('change', calcularDescuentoPack);
        if (descuentoInput) descuentoInput.addEventListener('input', calcularDescuentoPack);
        if (descuentoInput) descuentoInput.addEventListener('change', calcularDescuentoPack);

        submitBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await this.handlePackFormSubmit(mode, packId, form, selectedImage);
            closeModal();
        });
    }

    updatePackImagePreview(fileOrUrl) {
        const preview = document.getElementById('pack-image-preview'); if (!preview) return;
        if (typeof fileOrUrl === 'string') {
            preview.innerHTML = `<div class="image-preview-item"><img src="${fileOrUrl}" class="image-preview-img"><button type="button" class="image-preview-remove">×</button></div>`;
            preview.querySelector('.image-preview-remove').addEventListener('click', () => { preview.innerHTML = ''; const input = document.getElementById('pack-image-upload-input'); if (input) input.value = ''; });
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `<div class="image-preview-item"><img src="${e.target.result}" class="image-preview-img"><button type="button" class="image-preview-remove">×</button></div>`;
            preview.querySelector('.image-preview-remove').addEventListener('click', () => { preview.innerHTML = ''; const input = document.getElementById('pack-image-upload-input'); if (input) input.value = ''; });
        };
        reader.readAsDataURL(fileOrUrl);
    }

    /**
     * Setup de event listeners del modal
     */
    setupModalListeners(mode, productId) {
        const overlay = document.getElementById('product-modal-overlay');
        const form = document.getElementById('product-form');
        const closeBtn = document.querySelector('.modal-close');
        const cancelBtn = document.getElementById('btn-modal-cancel');
        const submitBtn = document.getElementById('btn-modal-submit');
        const imageUploadArea = document.getElementById('image-upload-area');
        const imageInput = document.getElementById('image-upload-input');
        const precioOriginalInput = document.getElementById('input-precio-original');
        const precioFinalInput = document.getElementById('input-precio-final');
        const descuentoInput = document.getElementById('input-descuento');
        let selectedImage = null;

        const product = mode === 'edit' ? this.productManager.getProductById(productId) : null;
        // Asegurar que la categoría del producto quede seleccionada cuando se edita
        const categorySelect = form.querySelector('select[name="categoria"]');
        if (categorySelect && product && product.categoria) {
            categorySelect.value = product.categoria;
        }

        // Mostrar preview de imagen existente (si existe) al editar
        if (product && product.imagenUrl && product.imagenUrl !== 'Img/no_image.jpg') {
            this.updateImagePreview(product.imagenUrl);
        }

        // Lógica de cálculo automático del descuento
        const calcularDescuento = () => {
            const precioOriginal = parseFloat(precioOriginalInput.value) || 0;
            const precioFinal = parseFloat(precioFinalInput.value) || 0;

            if (precioOriginal > 0 && precioFinal > 0) {
                if (precioFinal > precioOriginal) {
                    this.showNotification('El precio final no puede ser mayor al precio original', 'error');
                    precioFinalInput.value = '';
                    descuentoInput.value = 0;
                    return;
                }
                const descuentoPorcentaje = ((precioOriginal - precioFinal) / precioOriginal) * 100;
                descuentoInput.value = parseFloat(descuentoPorcentaje.toFixed(2));
            } else if (precioFinal === 0) {
                descuentoInput.value = 0;
            }
        };

        precioOriginalInput.addEventListener('change', calcularDescuento);
        precioFinalInput.addEventListener('input', calcularDescuento);
        precioFinalInput.addEventListener('change', calcularDescuento);

        // Cerrar modal
        const closeModal = () => {
            if (overlay && overlay.parentElement) {
                overlay.remove();
            }
            this.enableBodyScroll();
        };

        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                closeModal();
            });
        }
        cancelBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        // Manejo de imagen
        imageUploadArea.addEventListener('click', () => imageInput.click());

        imageUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            imageUploadArea.classList.add('dragover');
        });

        imageUploadArea.addEventListener('dragleave', () => {
            imageUploadArea.classList.remove('dragover');
        });

        imageUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            imageUploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                selectedImage = files[0];
                this.updateImagePreview(selectedImage);
            }
        });

        imageInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                selectedImage = e.target.files[0];
                this.updateImagePreview(selectedImage);
            }
        });

        // Enviar formulario
        submitBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await this.handleProductFormSubmit(mode, productId, form, selectedImage);
            closeModal();
        });
    }

    /**
     * Actualiza preview de imagen
     */
    updateImagePreview(fileOrUrl) {
        const preview = document.getElementById('image-preview');
        if (!preview) return;

        // Si se pasa una URL de imagen (imagen existente al editar)
        if (typeof fileOrUrl === 'string') {
            preview.innerHTML = `
                <div class="image-preview-item">
                    <img src="${fileOrUrl}" alt="Preview" class="image-preview-img">
                    <button type="button" class="image-preview-remove">×</button>
                </div>
            `;
            preview.querySelector('.image-preview-remove').addEventListener('click', () => {
                preview.innerHTML = '';
                const imageInput = document.getElementById('image-upload-input');
                if (imageInput) imageInput.value = '';
            });
            return;
        }

        // Si es un File
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `
                <div class="image-preview-item">
                    <img src="${e.target.result}" alt="Preview" class="image-preview-img">
                    <button type="button" class="image-preview-remove">×</button>
                </div>
            `;

            preview.querySelector('.image-preview-remove').addEventListener('click', () => {
                preview.innerHTML = '';
                const imageInput = document.getElementById('image-upload-input');
                if (imageInput) imageInput.value = '';
            });
        };
        reader.readAsDataURL(fileOrUrl);
    }

    /**
     * Setup de event listeners generales
     */
    setupEventListeners() {
        // Botón agregar (producto)
        const addBtn = document.getElementById('btn-add-product');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                return this.openProductModal(null, 'create');
            });
        }

        // Botón recargar
        const refreshBtn = document.getElementById('btn-refresh-products');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.handleRefreshProducts());
        }

        // Botón administrar imágenes del repo
        const imagesBtn = document.getElementById('btn-manage-repo-images');
        if (imagesBtn) {
            imagesBtn.addEventListener('click', () => {
                try {
                        if (!this.productManager) return this.showNotification('ProductManager no inicializado', 'error');
                        const ghManager = this.productManager.githubManager;
                        if (!ghManager || !ghManager.isConfigured()) {
                            return this.showNotification('Token de GitHub no configurado. Ve a Ajustes para configurarlo.', 'error');
                        }

                    if (!this.githubImagesModal) {
                        this.githubImagesModal = new GitHubImagesModal(ghManager, this.productManager);
                    }
                    this.githubImagesModal.show();
                } catch (err) {
                    console.error('Error abriendo modal de imágenes:', err);
                    this.showNotification('No se pudo abrir el modal de imágenes: ' + err.message, 'error');
                }
            });
        }

        // Búsqueda
        const searchInput = document.getElementById('search-products');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const q = e.target.value || '';
                const results = this.productManager.searchProducts(q);
                this.renderProductsGrid(results);
            });
        }

        // Filtro de categoría
        this.updateCategoryFilter();
        const categoryFilter = document.getElementById('filter-category');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                const val = e.target.value;
                const results = this.productManager.filterByCategory(val);
                this.renderProductsGrid(results);
            });
        }

        // Filtro por modificado / nuevos
        const modifiedFilter = document.getElementById('filter-modified');
        if (modifiedFilter) {
            modifiedFilter.addEventListener('change', (e) => {
                const v = e.target.value;
                let results = this.productManager.products;
                if (v === 'modified') {
                    const modifiedIds = new Set(this.productManager.getStagedChanges().filter(c=>c.type==='modify').map(c=>c.productId));
                    results = results.filter(p => modifiedIds.has(p.id));
                } else if (v === 'new') {
                    const newIds = new Set(this.productManager.getStagedChanges().filter(c=>c.type==='new').map(c=>c.productId));
                    results = results.filter(p => newIds.has(p.id));
                }
                this.renderProductsGrid(results);
            });
        }

        // Sort
        const sortSelect = document.getElementById('sort-products');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                const v = e.target.value;
                let results = [...this.productManager.products];
                if (v === 'price_desc') results.sort((a,b)=>b.precioFinal - a.precioFinal);
                else if (v === 'price_asc') results.sort((a,b)=>a.precioFinal - b.precioFinal);
                else if (v === 'date_modified') results.sort((a,b)=>new Date(b.modified_at || 0) - new Date(a.modified_at || 0));
                else if (v === 'date_created') results.sort((a,b)=>new Date(b.created_at || 0) - new Date(a.created_at || 0));
                this.renderProductsGrid(results);
            });
        }

        // Export CSV
        const exportBtn = document.getElementById('btn-export-csv');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                try {
                    const products = this.productManager.products || [];
                    const headers = ['nombre','categoria','precio','descuento','disponibilidad','created_at','modified_at'];
                    const rows = products.map(p => headers.map(h => (p[h]===null?"": String(p[h] || ''))).join(','));
                    const csv = [headers.join(','), ...rows].join('\n');
                    const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
                    const a = document.createElement('a');
                    a.href = dataUrl;
                    a.download = 'products_export.csv';
                    a.click();
                    } catch (err) { console.error('export csv error', err); this.showNotification('Error exportando CSV: '+err.message, 'error'); }
            });
        }

        // Clear filters
        const clearFiltersBtn = document.getElementById('btn-clear-filters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                const search = document.getElementById('search-products'); if (search) search.value = '';
                const cat = document.getElementById('filter-category'); if (cat) cat.value = '';
                const mod = document.getElementById('filter-modified'); if (mod) mod.value = 'all';
                const sort = document.getElementById('sort-products'); if (sort) sort.value = 'default';
                this.renderProductsGrid();
            });
        }

        // Botones de staging
        const discardAllBtn = document.getElementById('btn-discard-all');
        if (discardAllBtn) {
            discardAllBtn.addEventListener('click', () => this.handleDiscardAll());
        }

        const syncBtn = document.getElementById('btn-sync-github');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => this.handleSyncGitHub());
        }

        // Toggle Productos / Cambios (vista en la cabecera)
        const btnProducts = document.getElementById('btn-view-products');
        const btnChanges = document.getElementById('btn-view-changes');
        const productsGrid = document.getElementById('products-grid');
        const stagingPanel = document.getElementById('staging-panel');

        if (btnProducts && btnChanges) {
            btnProducts.addEventListener('click', () => {
                this.currentView = 'products';
                btnProducts.classList.add('active');
                btnChanges.classList.remove('active');
                if (productsGrid) productsGrid.classList.remove('hidden');
                if (stagingPanel) stagingPanel.classList.add('hidden');
                const toolbar = document.querySelector('.inventory-toolbar'); if (toolbar) toolbar.classList.remove('hidden');
                this.updateCategoryFilter();
                this.renderProductsGrid();
                // Ajustar texto del botón agregar
                const addBtn = document.getElementById('btn-add-product'); if (addBtn) addBtn.innerHTML = '<i class="fas fa-plus"></i> Nuevo Producto';
            });

            btnChanges.addEventListener('click', () => {
                this.currentView = 'changes';
                btnChanges.classList.add('active');
                btnProducts.classList.remove('active');
                if (productsGrid) productsGrid.classList.add('hidden');
                if (stagingPanel) stagingPanel.classList.remove('hidden');
                const toolbar = document.querySelector('.inventory-toolbar'); if (toolbar) toolbar.classList.add('hidden');
                this.updateStagingPanel();
            });
        }
    }

    /**
     * Actualiza el filtro de categorías
     */
    getActiveManager() {
        return this.productManager;
    }

    updateCategoryFilter() {
        const categoryFilter = document.getElementById('filter-category');
        if (!categoryFilter) return;

        const manager = this.getActiveManager();
        const categories = manager ? (manager.getAllCategories ? manager.getAllCategories() : []) : [];
        const currentValue = categoryFilter.value;

        const options = `
            <option value="">Todas las categorías</option>
            ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
        `;

        categoryFilter.innerHTML = options;
        categoryFilter.value = currentValue;
    }

    /**
     * Aplica previews de imágenes almacenadas en staging a las tarjetas de productos
     * Esto permite que al marcar un cambio con nueva imagen la vista muestre
     * inmediatamente la imagen seleccionada desde IndexedDB (Base64).
     */
    async applyStagedImagesToGrid() {
        const allManagers = [this.productManager, this.packManager].filter(Boolean);
        for (const mgr of allManagers) {
            try {
                const changesWithImages = (mgr.getStagedChanges ? mgr.getStagedChanges() : []).filter(c => c.hasNewImage && c.imageKey);
                if (!changesWithImages || changesWithImages.length === 0) continue;

                for (const change of changesWithImages) {
                    try {
                        const imgData = await mgr.stagingDB.getImageFromIDB(change.imageKey);
                        if (!imgData || !imgData.base64) continue;

                        const src = base64ToDataURL(imgData.base64, imgData.mimeType || 'image/jpeg');
                        const selectorId = change.productId || change.packId || change.productId;
                        const card = document.querySelector(`.product-card[data-product-id="${selectorId}"], .pack-card[data-pack-id="${selectorId}"]`);
                        if (!card) continue;

                        const imgEl = card.querySelector('.product-image img');
                        if (imgEl) imgEl.src = src;

                        try {
                            const sizeLabelEl = card.querySelector('.product-image-size');
                            if (sizeLabelEl && imgData.base64) {
                                const b64 = imgData.base64;
                                let padding = 0;
                                if (b64.endsWith('==')) padding = 2;
                                else if (b64.endsWith('=')) padding = 1;
                                const bytes = Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
                                sizeLabelEl.textContent = this.formatBytes ? this.formatBytes(bytes) : '';
                                sizeLabelEl.title = `${bytes} bytes`;
                            }
                        } catch (e) { /* ignore */ }

                        if (!card.querySelector('.product-badge.modified')) {
                            const imgWrap = card.querySelector('.product-image');
                            if (imgWrap) {
                                const badge = document.createElement('span');
                                badge.className = 'product-badge modified';
                                badge.textContent = 'Modificado';
                                imgWrap.appendChild(badge);
                            }
                        }
                    } catch (err) {
                        console.warn('applyStagedImagesToGrid error', err);
                    }
                }
            } catch (e) { /* ignore manager failures */ }
        }
    }

    /**
     * Formatea bytes a cadena legible (B, KB, MB)
     */
    formatBytes(bytes) {
        if (!bytes && bytes !== 0) return '';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${sizes[i]}`;
    }

    /**
     * Intenta obtener el tamaño de las imágenes (HEAD) y completar las etiquetas
     */
    async populateProductImageSizes() {
        try {
            const els = Array.from(document.querySelectorAll('.product-image-size'));
            if (!els || els.length === 0) return;

            const tasks = els.map(async (el) => {
                try {
                    const src = el.dataset.src;
                    if (!src) return;

                    // Skip local placeholder
                    if (src.includes('no_image.jpg')) {
                        el.textContent = '';
                        return;
                    }

                    // Try HEAD first
                    let size = null;
                    try {
                        const resp = await fetch(src, { method: 'HEAD' });
                        if (resp && resp.ok) {
                            const cl = resp.headers.get('content-length');
                            if (cl) size = parseInt(cl, 10);
                        }
                    } catch (headErr) {
                        // ignore
                    }

                    // If HEAD didn't return size, avoid heavy GET; leave blank
                    if (size != null && !isNaN(size)) {
                        el.textContent = this.formatBytes(size);
                        el.title = `${size} bytes`;
                    } else {
                        el.textContent = '';
                    }
                } catch (err) {
                    // avoid bubbling errors
                    console.warn('populateProductImageSizes error', err);
                }
            });

            await Promise.allSettled(tasks);
        } catch (err) {
            console.warn('populateProductImageSizes outer error', err);
        }
    }

    /**
     * Añade listeners a las miniaturas de producto para abrir un modal con la imagen grande
     */
    setupProductImageModalListeners() {
        try {
            const imgs = Array.from(document.querySelectorAll('.product-image img'));
            imgs.forEach(img => {
                img.style.cursor = 'pointer';
                if (img.dataset.listenerAdded) return;
                img.addEventListener('click', (e) => {
                    const src = img.src;
                    const alt = img.alt || '';
                    this.showProductImageModal(src, alt);
                });
                img.dataset.listenerAdded = '1';
            });
        } catch (err) {
            console.warn('setupProductImageModalListeners error', err);
        }
    }

    /**
     * Muestra un modal simple con la imagen (clic para cerrar, ESC para cerrar)
     */
    showProductImageModal(src, alt = '') {
        try {
            // Remover modal previo si existe
            const existing = document.getElementById('product-image-modal-overlay');
            if (existing) existing.remove();

            const modalHtml = `
                <div id="product-image-modal-overlay" class="modal-overlay active" style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.8);z-index:2000;">
                    <div role="dialog" aria-modal="true" style="max-width:90%;max-height:90%;display:flex;flex-direction:column;gap:0.5rem;align-items:center;">
                        <img src="${src}" alt="${alt}" style="max-width:100%;max-height:calc(100vh - 120px);border-radius:6px;box-shadow:0 6px 24px rgba(0,0,0,0.5);">
                        <button id="product-image-modal-close" style="background:#fff;border:none;padding:0.4rem 0.6rem;border-radius:6px;cursor:pointer;">Cerrar</button>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
            // Bloquear scroll del fondo
            this.disableBodyScroll();

            const overlay = document.getElementById('product-image-modal-overlay');
            if (!overlay) return;

            const onClose = () => { const o = document.getElementById('product-image-modal-overlay'); if (o) o.remove(); document.removeEventListener('keydown', escListener); this.enableBodyScroll(); };

            const escListener = (e) => { if (e.key === 'Escape') onClose(); };

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) onClose();
            });

            const closeBtn = document.getElementById('product-image-modal-close');
            if (closeBtn) closeBtn.addEventListener('click', onClose);

            document.addEventListener('keydown', escListener);
        } catch (err) {
            console.warn('showProductImageModal error', err);
        }
    }

    /**
     * Manejadores de eventos
     */

    async handleProductFormSubmit(mode, productId, form, imageFile) {
        const formData = new FormData(form);
        const descuentoCalculado = parseFloat(formData.get('descuento')) || 0;
        
        // Si es un producto NUEVO, generar el ID temprano para poder asociar el inventario después
        let workingProductId = productId;
        if (mode === 'new') {
            if (typeof generateProductId === 'function') {
                workingProductId = generateProductId();
            } else {
                workingProductId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
        }
        
        // SEGURIDAD: Construcción explícita de productData (whitelist de campos)
        // Los campos de inventario (inventory_*) se incluyen TEMPORALMENTE para pasarlos al staging,
        // pero se eliminarán durante prepareProductForExport
        const productData = {
            id: workingProductId,
            nombre: formData.get('nombre'),
            categoria: formData.get('categoria'),
            precio: parseFloat(formData.get('precio')),
            descuento: descuentoCalculado,
            descripcion: formData.get('descripcion'),
            disponibilidad: formData.get('disponibilidad') === 'on',
            nuevo: formData.get('nuevo') === 'on',
            oferta: formData.get('oferta') === 'on',
            mas_vendido: formData.get('mas_vendido') === 'on',
            // Incluir campos de inventario temporalmente (se descartarán en prepareProductForExport)
            // para que estén disponibles cuando se guarde el inventario
            inventory_stock: formData.get('inventory_stock'),
            inventory_precio_compra: formData.get('inventory_precio_compra'),
            inventory_proveedor: formData.get('inventory_proveedor'),
            inventory_notas: formData.get('inventory_notas')
        };

        // Si estamos editando, mantener las imagenes actuales si no se selecciona una nueva
        if (mode === 'edit') {
            const existingProduct = this.productManager.getProductById(productId);
            productData.imagenes = existingProduct?.imagenes ? [...existingProduct.imagenes] : (existingProduct?.imagenes || []);
        }

        try {
            const changeType = mode === 'edit' ? 'modify' : 'new';
            await this.productManager.stageChange(changeType, productData, imageFile);
            
            // Guardar datos privados de inventario si existen (SEPARADAMENTE)
            // Ahora también para productos nuevos (con el ID que se acaba de asignar)
            if (workingProductId) {
                await this.saveInventoryData(workingProductId, formData);
            }
            
            this.updateStagingPanel();
            this.renderProductsGrid();
            
            this.showNotification('Producto guardado en staging', 'success');
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    }

    /**
     * Guarda datos privados del inventario interno (SEPARADOS del producto)
     * IMPORTANTE: Los datos de inventario se guardan en Google Apps Script backend, NOT en GitHub
     * Si el backend no está disponible, se guardan en localStorage como respaldo
     * @param {string} productId - ID del producto
     * @param {FormData} formData - Datos del formulario (contiene campos con prefijo inventory_*)
     */
    async saveInventoryData(productId, formData) {
        try {
            // SEGURIDAD: Solo extraer campos de inventario (con prefijo inventory_)
            // Aplicar valores por defecto si están vacíos
            const inventoryData = {
                stock: formData.get('inventory_stock') !== '' && formData.get('inventory_stock') !== null ? formData.get('inventory_stock') : 0,
                precio_compra: formData.get('inventory_precio_compra') !== '' && formData.get('inventory_precio_compra') !== null ? formData.get('inventory_precio_compra') : 0,
                proveedor: (formData.get('inventory_proveedor') !== '' && formData.get('inventory_proveedor') !== null) ? formData.get('inventory_proveedor') : null,
                notas: (formData.get('inventory_notas') !== '' && formData.get('inventory_notas') !== null) ? formData.get('inventory_notas') : 'nota'
                // ❌ NUNCA incluir campos de producto: nombre, categoria, precio, etc.
            };

            // Solo guardar si hay al menos un campo con datos (siempre guardar si hay algo rellenado)
            const stockFilled = formData.get('inventory_stock') !== '' && formData.get('inventory_stock') !== null;
            const precioFilled = formData.get('inventory_precio_compra') !== '' && formData.get('inventory_precio_compra') !== null;
            const proveedorFilled = formData.get('inventory_proveedor') !== '' && formData.get('inventory_proveedor') !== null;
            const notasFilled = formData.get('inventory_notas') !== '' && formData.get('inventory_notas') !== null;
            
            const hasData = stockFilled || precioFilled || proveedorFilled || notasFilled;
            if (!hasData) {
                console.log(`ℹ️ No hay datos de inventario para guardar para producto ${productId}`);
                return;
            }

            console.log(`🔄 Intentando guardar inventario para ${productId} en backend...`, inventoryData);

            try {
                // Intentar guardar en BACKEND (Google Apps Script)
                await this.inventoryApiClient.saveInventory(productId, inventoryData);
                console.log(`✅ Datos de inventario guardados para producto ${productId} en backend`);
                
                // Si se guardó exitosamente en backend, limpiar cualquier respaldo en localStorage
                this._removeInventoryFromLocalStorage(productId);
            } catch (backendError) {
                console.warn(`⚠️ Backend no disponible (${backendError && backendError.message}). Guardando inventario en localStorage como respaldo...`);
                
                // Guardar en localStorage como respaldo temporal
                this._saveInventoryToLocalStorage(productId, inventoryData);
                
                console.log(`💾 Datos de inventario guardados en localStorage para ${productId}. Se sincronizarán al guardar en GitHub.`);
            }
        } catch (error) {
            console.error(`❌ Error procesando datos de inventario para ${productId}:`, error);
            // No lanzamos el error para que no bloquee el guardado del producto
        }
    }

    /**
     * Guarda datos de inventario en localStorage como respaldo
     * @private
     */
    _saveInventoryToLocalStorage(productId, inventoryData) {
        try {
            const storageKey = `casa_fresca_inventory_${productId}`;
            const dataToStore = {
                productId,
                inventoryData,
                timestamp: new Date().toISOString(),
                synced: false
            };
            localStorage.setItem(storageKey, JSON.stringify(dataToStore));
            console.log(`Datos guardados en localStorage: ${storageKey}`);
        } catch (err) {
            console.error('Error guardando en localStorage:', err);
        }
    }

    /**
     * Elimina datos de inventario del localStorage
     * @private
     */
    _removeInventoryFromLocalStorage(productId) {
        try {
            const storageKey = `casa_fresca_inventory_${productId}`;
            localStorage.removeItem(storageKey);
        } catch (err) {
            console.warn('Error eliminando del localStorage:', err);
        }
    }

    /**
     * Recupera todos los datos de inventario del localStorage (respaldos pendientes)
     * @private
     */
    _getPendingInventoryFromLocalStorage() {
        try {
            const pending = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('casa_fresca_inventory_')) {
                    const stored = JSON.parse(localStorage.getItem(key));
                    if (stored && !stored.synced) {
                        pending[stored.productId] = stored.inventoryData;
                    }
                }
            }
            return pending;
        } catch (err) {
            console.warn('Error recuperando inventario de localStorage:', err);
            return {};
        }
    }

    async handlePackFormSubmit(mode, packId, form, imageFile) {
        const formData = new FormData(form);
        const packData = {
            id: mode === 'edit' ? packId : undefined,
            nombre: formData.get('nombre'),
            categoria: 'Pack',
            precio: parseFloat(formData.get('precio')) || 0,
            // descuento se calculará a partir de 'precio_final_deseado' si está presente
            descuento: 0,
            descripcion: formData.get('descripcion'),
            caracteristicas: (formData.get('caracteristicas') || '').split('\n').map(s => s.trim()).filter(s => s.length > 0),
            disponible: formData.get('disponible') === 'on',
            top: formData.get('top') === 'on',
            nuevo: formData.get('nuevo') === 'on',
            oferta: formData.get('oferta') === 'on'
        };

        // Si el formulario trae 'precio_final_deseado', calcular porcentaje de descuento
        const precioOriginal = parseFloat(formData.get('precio')) || 0;
        const precioFinalDeseado = parseFloat(formData.get('precio_final_deseado')) || null;
        if (precioOriginal > 0 && precioFinalDeseado && precioFinalDeseado >= 0) {
            if (precioFinalDeseado > precioOriginal) {
                this.showNotification('El precio final no puede ser mayor al precio original', 'error');
                return;
            }
            const descuentoPorc = ((precioOriginal - precioFinalDeseado) / precioOriginal) * 100;
            packData.descuento = parseFloat(descuentoPorc.toFixed(2));
        } else {
            // fallback: si existe un campo descuento numérico (compatibilidad), usarlo
            const fallback = parseFloat(formData.get('descuento'));
            packData.descuento = !isNaN(fallback) ? fallback : 0;
        }

        if (mode === 'edit') {
            const existing = this.packManager.getPackById(packId);
            packData.imagenes = existing?.imagenes ? [...existing.imagenes] : (existing?.imagen ? [existing.imagen] : []);
        }

        try {
            const changeType = mode === 'edit' ? 'modify' : 'new';
            await this.packManager.stageChange(changeType, packData, imageFile);
            this.updateStagingPanel();
            this.renderPacksGrid();
            this.showNotification('Pack guardado en staging', 'success');
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    }

    async handleDeleteProduct(productId) {
        const product = this.productManager.getProductById(productId);
        if (!product) return;

        try {
            await this.productManager.stageChange('delete', product);
            this.updateStagingPanel();
            this.renderProductsGrid();
            this.showNotification('Producto marcado para eliminar', 'success');
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    }

    async handleDeletePack(packId) {
        if (!this.packManager) return;
        const pack = this.packManager.getPackById(packId);
        if (!pack) return;

        try {
            await this.packManager.stageChange('delete', pack);
            this.updateStagingPanel();
            this.renderPacksGrid();
            this.showNotification('Pack marcado para eliminar', 'success');
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    }

    async handleDiscardChange(changeId) {
        try {
            // Determinar a qué manager pertenece el cambio
            let handled = false;
            if (this.productManager && this.productManager.getStagedChanges().some(c => c.id === changeId)) {
                await this.productManager.discardChange(changeId);
                handled = true;
            }
            if (!handled && this.packManager && this.packManager.getStagedChanges().some(c => c.id === changeId)) {
                await this.packManager.discardChange(changeId);
                handled = true;
            }

            if (!handled) throw new Error('Cambio no encontrado');

            this.updateStagingPanel();
            this.showNotification('Cambio descartado', 'info');
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    }

    async handleEditChange(changeId) {
        try {
            // Buscar el cambio en productManager o packManager
            let change = this.productManager ? this.productManager.getStagedChanges().find(c => c.id === changeId) : null;
            let manager = this.productManager;
            let kind = 'product';
            if (!change && this.packManager) {
                change = this.packManager.getStagedChanges().find(c => c.id === changeId);
                manager = this.packManager;
                kind = 'pack';
            }

            if (!change) throw new Error('Cambio no encontrado');
            if (change.type !== 'modify') {
                this.showNotification('Solo se pueden editar cambios de tipo modificar', 'warning');
                return;
            }

            // Reabrir modal correspondiente
            if (kind === 'product') {
                const productId = change.productId;
                this.openProductModal(productId, 'edit');
                // Esperar a que el modal sea insertado
                await new Promise(r => setTimeout(r, 60));

                const form = document.getElementById('product-form');
                if (!form) return;

                // Rellenar campos con datos staged
                const nameInput = document.getElementById('product-name-input'); if (nameInput) nameInput.value = change.productData.nombre || '';
                const categorySelect = document.getElementById('product-category-select'); if (categorySelect) categorySelect.value = change.productData.categoria || '';
                const precioInput = document.getElementById('input-precio-original'); if (precioInput) precioInput.value = (change.productData.precio !== undefined ? change.productData.precio : '');
                const precioFinalInput = document.getElementById('input-precio-final');
                if (precioFinalInput) {
                    let precioFinal = change.productData.precioFinal;
                    if (precioFinal === undefined || precioFinal === null) {
                        const p = parseFloat(change.productData.precio) || 0;
                        const d = parseFloat(change.productData.descuento) || 0;
                        if (p > 0) precioFinal = parseFloat((p * (1 - d / 100)).toFixed(2));
                        else precioFinal = '';
                    }
                    precioFinalInput.value = precioFinal;
                }
                const descripcion = document.getElementById('input-descripcion'); if (descripcion) descripcion.value = change.productData.descripcion || '';

                const setChk = (name, val) => { const el = form.querySelector(`input[name="${name}"]`); if (el) el.checked = !!val; };
                setChk('disponibilidad', change.productData.disponibilidad !== false);
                setChk('nuevo', change.productData.nuevo);
                setChk('oferta', change.productData.oferta);
                setChk('mas_vendido', change.productData.mas_vendido);

                // Imagen staged o existente
                if (change.hasNewImage && change.imageKey) {
                    try {
                        const img = await manager.stagingDB.getImageFromIDB(change.imageKey);
                        if (img && img.base64) {
                            const src = base64ToDataURL(img.base64, img.mimeType || 'image/jpeg');
                            this.updateImagePreview(src);
                        }
                    } catch (err) {
                        console.warn('No se pudo cargar imagen staged:', err);
                    }
                } else if (change.productData.imagenes && change.productData.imagenes.length > 0) {
                    const imgName = change.productData.imagenes[0];
                    try {
                        const src = imgName.startsWith('http') ? imgName : manager.getImageUrl(imgName);
                        this.updateImagePreview(src);
                    } catch (err) { console.warn('No se pudo cargar imagen existente:', err); }
                }
            } else {
                // Pack
                const packId = change.productId || change.productData.id;
                this.openPackModal(packId, 'edit');
                await new Promise(r => setTimeout(r, 60));

                const form = document.getElementById('pack-form');
                if (!form) return;

                const nameInput = form.querySelector('input[name="nombre"]'); if (nameInput) nameInput.value = change.productData.nombre || '';
                const precioInput = document.getElementById('input-pack-precio-original'); if (precioInput) precioInput.value = (change.productData.precio !== undefined ? change.productData.precio : '');

                // Calcular precio final deseado desde descuento si es posible
                const descuento = parseFloat(change.productData.descuento) || 0;
                const pOrig = parseFloat(change.productData.precio) || 0;
                const precioFinalDesiredInput = document.getElementById('input-pack-descuento');
                if (precioFinalDesiredInput) {
                    if (pOrig > 0) {
                        const precioFinal = parseFloat((pOrig * (1 - descuento / 100)).toFixed(2));
                        precioFinalDesiredInput.value = precioFinal;
                        precioFinalDesiredInput.dataset.calculated = descuento.toFixed(2);
                    } else {
                        precioFinalDesiredInput.value = '';
                        precioFinalDesiredInput.dataset.calculated = '0';
                    }
                }

                const descText = document.getElementsByName('descripcion')[0]; if (descText) descText.value = change.productData.descripcion || '';
                const featuresTextarea = document.getElementById('pack-features-textarea'); if (featuresTextarea) featuresTextarea.value = Array.isArray(change.productData.caracteristicas) ? change.productData.caracteristicas.join('\n') : (change.productData.caracteristicas || '');

                const setChk = (name, val) => { const el = form.querySelector(`input[name="${name}"]`); if (el) el.checked = !!val; };
                setChk('disponible', change.productData.disponible !== false);
                setChk('top', change.productData.top);
                setChk('nuevo', change.productData.nuevo);
                setChk('oferta', change.productData.oferta);

                // Imagen
                if (change.hasNewImage && change.imageKey) {
                    try {
                        const img = await manager.stagingDB.getImageFromIDB(change.imageKey);
                        if (img && img.base64) {
                            const src = base64ToDataURL(img.base64, img.mimeType || 'image/jpeg');
                            this.updatePackImagePreview(src);
                        }
                    } catch (err) {
                        console.warn('No se pudo cargar imagen staged pack:', err);
                    }
                } else if (change.productData.imagenes && change.productData.imagenes.length > 0) {
                    const imgName = change.productData.imagenes[0];
                    try {
                        const src = imgName.startsWith('http') ? imgName : manager.getImageUrl(imgName);
                        this.updatePackImagePreview(src);
                    } catch (err) { console.warn('No se pudo cargar imagen existente pack:', err); }
                }
            }

        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    }

    async handleDiscardAll() {
        const ok = await this.showConfirmDialog('¿Descartar todos los cambios en staging?');
        if (!ok) return;
        try {
            if (this.productManager) await this.productManager.discardAllChanges();
            if (this.packManager) await this.packManager.discardAllChanges();
            this.updateStagingPanel();
            this.showNotification('Todos los cambios han sido descartados', 'info');
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    }

    async handleSyncGitHub() {
        const syncBtn = document.getElementById('btn-sync-github');
        if (!syncBtn) return;
        const originalText = syncBtn.innerHTML;
        syncBtn.disabled = true;
        syncBtn.innerHTML = '<span class="loading-spinner"></span> Sincronizando...';

        // Use modal if available
        const modal = this.githubSaveModal || null;
        if (modal) modal.showLoading();

        const progressCb = (percent, message) => {
            try {
                if (modal) {
                    if (percent != null) modal.showProgress(percent, message || 'Procesando...');
                    else modal.updateDetail(message || 'Procesando...');
                }
            } catch (e) { console.warn('progressCb error', e); }
        };

        const doSync = async () => {
            try {
                let combinedMsg = '';
                if (this.productManager) {
                    try { const resultP = await this.productManager.saveAllStagedChanges(progressCb); combinedMsg += resultP && resultP.message ? resultP.message : ''; } catch(e) { console.warn('product sync failed', e); }
                }
                if (this.packManager) {
                    try { const resultK = await this.packManager.saveAllStagedChanges(progressCb); combinedMsg += (combinedMsg ? ' | ' : '') + (resultK && resultK.message ? resultK.message : 'Packs sincronizados'); } catch(e) { console.warn('pack sync failed', e); }
                }

                // Fuerza recarga desde GitHub para reflejar exactamente el estado remoto
                try {
                    if (this.productManager) await this.productManager.loadProducts();
                } catch (e) { console.warn('reload products after sync failed', e); }
                try {
                    if (this.packManager) await this.packManager.loadPacks();
                } catch (e) { console.warn('reload packs after sync failed', e); }

                // Actualizar UI según datos recargados
                this.updateCategoryFilter();
                this.updateStagingPanel();
                if (this.currentView === 'packs') this.renderPacksGrid();
                else this.renderProductsGrid();
                const msg = combinedMsg || 'Sincronización completada exitosamente';
                if (modal) modal.showSuccess(msg, 0);
                this.showNotification(`✓ ${msg}`, 'success');
            } catch (error) {
                if (modal) modal.showError(error.message || 'Error desconocido', () => doSync());
                this.showNotification(`Error en sincronización: ${error.message}`, 'error');
            } finally {
                syncBtn.disabled = false;
                syncBtn.innerHTML = originalText;
            }
        };

        // Ejecutar sincronización
        doSync();
    }

    async handleRefreshProducts() {
        const refreshBtn = document.getElementById('btn-refresh-products');
        if (!refreshBtn) return;

        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<i class="fas fa-spinner-third"></i> Cargando...';

        try {
            // Mostrar modal de recarga
            this.showLoadingModal('Recargando datos desde el servidor...');

            if (this.productManager) await this.productManager.loadProducts(true); // force reload from server
            if (this.packManager) await this.packManager.loadPacks();

            // Actualizar filtros y UI con los datos recargados
            this.updateCategoryFilter();
            if (this.currentView === 'packs') this.renderPacksGrid(); else this.renderProductsGrid();

            // Ensure staging panel and badges reflect reconciled staged changes
            try { this.updateStagingPanel(); } catch(e) { console.warn('updateStagingPanel error', e); }
            this.showNotification('Datos recargados', 'success');
        } catch (error) {
            this.showNotification(`Error al cargar productos: ${error.message}`, 'error');
        } finally {
            this.hideLoadingModal();
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Recargar';
        }
    }

    /**
     * Actualiza los badges y números del toolbar (counts)
     */
    updateToolbarStats() {
        const products = this.productManager.products || [];
        const total = products.length;
        const available = products.filter(p => p.disponibilidad).length;
        const unavailable = total - available;
        const staged = this.productManager.getStagedChanges ? (this.productManager.getStagedChanges() || []) : [];
        const modifiedCount = staged.filter(c => c.type === 'modify').length;

        // Packs metrics
        const packs = this.packManager ? (this.packManager.packs || []) : [];
        const packsTotal = packs.length;
        const packsAvailable = packs.filter(p => p.disponible !== false).length;
        const packsStaged = this.packManager && this.packManager.getStagedChanges ? (this.packManager.getStagedChanges() || []) : [];
        const packsModified = packsStaged.filter(c => c.type === 'modify').length;

        const elTotal = document.getElementById('stat-total');
        const elAvailable = document.getElementById('stat-available');
        const elUnavailable = document.getElementById('stat-unavailable');
        const elModified = document.getElementById('stat-modified-count');
        const elPacksSep = document.getElementById('stat-packs-sep');
        const elPacksTotal = document.getElementById('stat-packs-total');
        const elPacksAvailable = document.getElementById('stat-packs-available');
        const elPacksModified = document.getElementById('stat-packs-modified');

        if (elTotal) elTotal.textContent = `Total: ${total}`;
        if (elAvailable) elAvailable.textContent = `Disponibles: ${available}`;
        if (elUnavailable) elUnavailable.textContent = `No disponibles: ${unavailable}`;
        if (elModified) elModified.textContent = `Modificados: ${modifiedCount}`;
        if (elPacksSep) elPacksSep.textContent = '|';
        if (elPacksTotal) elPacksTotal.textContent = `Packs: ${packsTotal}`;
        if (elPacksAvailable) elPacksAvailable.textContent = `P.Disponibles: ${packsAvailable}`;
        if (elPacksModified) elPacksModified.textContent = `P.Modificados: ${packsModified}`;
    }

    /**
     * Muestra notificaciones
     */
    showNotification(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert ${type}`;
        
        const iconClass = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        }[type] || 'fa-info-circle';

        alertDiv.innerHTML = `
            <i class="fas ${iconClass}"></i>
            <span>${message}</span>
        `;

        const container = document.querySelector('.inventory-header') || this.container;
        container.insertAdjacentElement('afterend', alertDiv);

        setTimeout(() => {
            alertDiv.remove();
        }, 4000);
    }

    /**
     * Muestra un modal de carga simple con mensaje (usar para recargas)
     * @param {string} message
     * @param {string} id
     */
    showLoadingModal(message = 'Recargando...', id = 'refresh-loading-modal') {
        // Remover si existe
        const old = document.getElementById(id);
        if (old) old.remove();
        const overlay = document.createElement('div');
        overlay.id = id;
        overlay.className = 'modal-overlay active';
        overlay.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);z-index:3000;';
        overlay.innerHTML = `
            <div style="background:#fff;padding:1.25rem 1.5rem;border-radius:8px;display:flex;align-items:center;gap:0.75rem;min-width:240px;box-shadow:0 8px 24px rgba(0,0,0,0.25);">
                <span class="loading-spinner" style="width:28px;height:28px;display:inline-block;"></span>
                <div style="font-weight:600;">${message}</div>
            </div>
        `;
        document.body.appendChild(overlay);
        try { this.disableBodyScroll(); } catch (e) { /* ignore */ }
    }

    hideLoadingModal(id = 'refresh-loading-modal') {
        const el = document.getElementById(id);
        if (el) el.remove();
        try { this.enableBodyScroll(); } catch (e) { /* ignore */ }
    }

    // Bloqueo de scroll del background cuando hay modales abiertos
    disableBodyScroll() {
        try {
            this._modalOpenCount = (this._modalOpenCount || 0) + 1;
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
            document.body.classList.add('modal-open');
        } catch (e) { console.warn('disableBodyScroll error', e); }
    }

    enableBodyScroll() {
        try {
            this._modalOpenCount = Math.max(0, (this._modalOpenCount || 0) - 1);
            if (this._modalOpenCount === 0) {
                document.documentElement.style.overflow = '';
                document.body.style.overflow = '';
                document.body.classList.remove('modal-open');
            }
        } catch (e) { console.warn('enableBodyScroll error', e); }
    }

    /**
     * Muestra una previsualización del producto a eliminar con diálogo de confirmación
     * @param {Object} product - Producto a eliminar
     * @returns {Promise<boolean>}
     */
    showDeleteProductPreview(product) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'delete-preview-overlay';
            
            const discountText = product.descuento > 0 
                ? `<div class="product-discount-info">Descuento: ${product.descuento}%</div>` 
                : '';
            
            const badges = `
                ${product.nuevo ? '<span class="product-badge new">Nuevo</span>' : ''}
                ${product.oferta ? '<span class="product-badge sale">Oferta</span>' : ''}
            `;
            
            overlay.innerHTML = `
                <div class="delete-preview-box">
                    <div class="delete-preview-header">
                        <h3>Confirmar Eliminación de Producto</h3>
                    </div>
                    <div class="delete-preview-content">
                        <div class="delete-preview-image-container">
                            <img src="${product.imagenUrl}" alt="${product.nombre}" class="delete-preview-image" onerror="this.src='Img/no_image.jpg'">
                            <div class="delete-preview-badges">${badges}</div>
                        </div>
                        <div class="delete-preview-info">
                            <div class="delete-preview-name">${product.nombre}</div>
                            <div class="delete-preview-category">${product.categoria}</div>
                            <div class="delete-preview-description">${product.descripcion || 'Sin descripción'}</div>
                            <div class="delete-preview-price">
                                <span class="price-label">Precio:</span>
                                <span class="price-value">$${product.precioFinal.toFixed(2)}</span>
                            </div>
                            ${discountText}
                            <div class="delete-preview-warning">
                                <i class="fas fa-exclamation-triangle"></i>
                                <span>Esta acción eliminará el producto y sus datos de inventario</span>
                            </div>
                        </div>
                    </div>
                    <div class="delete-preview-actions">
                        <button class="btn-delete-confirm">
                            <i class="fas fa-trash"></i> Eliminar Producto
                        </button>
                        <button class="btn-delete-cancel">Cancelar</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(overlay);
            this.disableBodyScroll();
            
            const confirmBtn = overlay.querySelector('.btn-delete-confirm');
            const cancelBtn = overlay.querySelector('.btn-delete-cancel');
            
            const cleanup = (val) => { 
                overlay.remove(); 
                this.enableBodyScroll(); 
                resolve(val); 
            };
            
            confirmBtn.addEventListener('click', () => cleanup(true));
            cancelBtn.addEventListener('click', () => cleanup(false));
            overlay.addEventListener('click', (e) => { 
                if (e.target === overlay) cleanup(false); 
            });
        });
    }

    /**
     * Muestra un diálogo de confirmación custom y devuelve Promise<boolean>
     * @param {string} message
     * @returns {Promise<boolean>}
     */
    showConfirmDialog(message) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.innerHTML = `
                <div class="confirm-box">
                    <div class="confirm-message">${message}</div>
                    <div class="confirm-actions">
                        <button class="btn-confirm-yes">Sí</button>
                        <button class="btn-confirm-no">No</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            // Bloquear scroll del fondo mientras está el diálogo
            this.disableBodyScroll();
            const yes = overlay.querySelector('.btn-confirm-yes');
            const no = overlay.querySelector('.btn-confirm-no');
            const cleanup = (val) => { overlay.remove(); this.enableBodyScroll(); resolve(val); };
            yes.addEventListener('click', () => cleanup(true));
            no.addEventListener('click', () => cleanup(false));
            overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(false); });
        });
    }
}
/**
 * Inicializador del Sistema de Inventario
 * Integración con el Dashboard Principal
 */


export class InventoryApp {
    constructor(githubManager = null) {
        this.productManager = null;
        this.uiRenderer = null;
        this.githubManager = githubManager;
        this.initialized = false;
    }

    /**
     * Inicializa la aplicación de inventario (prepara manager). La UI se inicializa bajo demanda
     */
    async initialize() {
        try {
            console.log('Inicializando Sistema de Inventario (sin UI, inicialización bajo demanda)...');

            // Crear gestor de productos
            this.productManager = new ProductManager(this.githubManager);
            await this.productManager.init();

            // Crear gestor de packs
            this.packManager = new PackManager(this.githubManager);
            await this.packManager.init();

            // Pre-cargar productos e inventarios para que estén listos al abrir la UI
            try {
                await this.productManager.loadProducts();
                console.log('✓ Productos e inventarios precargados');
            } catch (preErr) {
                console.warn('Precarga de productos/inventario falló (se cargará on-demand):', preErr && preErr.message ? preErr.message : preErr);
            }

            this.initialized = true;
            console.log('✓ ProductManager listo (llame a showInventory() para inicializar la UI)');
        } catch (error) {
            console.error('Error al inicializar Sistema de Inventario:', error);
            this.showError(`Error al inicializar inventario: ${error.message}`);
        }
    }

    /**
     * Inicializa la UI del inventario y carga productos si no está inicializada
     */
    async showInventory() {
        try {
            if (!this.productManager) {
                this.productManager = new ProductManager(this.githubManager);
                await this.productManager.init();
            }

            if (!this.uiRenderer) {
                this.uiRenderer = new InventoryUIRenderer('#inventory-view');
                await this.uiRenderer.initInventoryUI(this.productManager);
            }

            // Cargar productos y actualizar UI
            await this.productManager.loadProducts();
            this.uiRenderer.renderProductsGrid();
            this.uiRenderer.updateCategoryFilter();
            this.uiRenderer.updateStagingPanel();

        } catch (error) {
            console.error('Error mostrando inventario:', error);
            this.showError(`Error al mostrar inventario: ${error.message}`);
        }
    }

    /**
     * Carga productos desde GitHub (mantiene compatibilidad)
     */
    async loadProducts() {
        try {
            await this.productManager.loadProducts();
            if (this.uiRenderer) {
                this.uiRenderer.renderProductsGrid();
                this.uiRenderer.updateCategoryFilter();
                this.uiRenderer.updateStagingPanel();
            }
        } catch (error) {
            console.error('Error al cargar productos:', error);
            this.showError(`Error al cargar productos: ${error.message}`);
        }
    }

    /**
     * Obtiene estadísticas del staging
     */
    getStagingStats() {
        if (!this.productManager) return null;
        return this.productManager.getStagingStats();
    }

    /**
     * Muestra error en UI
     */
    showError(message) {
        const container = document.querySelector('.inventory-header') || this.uiRenderer.container;
        if (container) {
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert error';
            alertDiv.innerHTML = `
                <i class="fas fa-exclamation-circle"></i>
                <span>${message}</span>
            `;
            container.insertAdjacentElement('afterend', alertDiv);
            setTimeout(() => alertDiv.remove(), 5000);
        }
    }

    /**
     * Obtiene el ProductManager
     */
    getProductManager() {
        return this.productManager;
    }

    /**
     * Obtiene el UIRenderer
     */
    getUIRenderer() {
        return this.uiRenderer;
    }
}

export default InventoryApp;
