/**
 * Configuración Global del Proyecto
 */

export const CONFIG = {
    BACKEND_URL: 'https://backend-casafresca.onrender.com',
    GITHUB: {
        REPO: 'supportcasafresca-cpu/Analytics-Casa-Fresca',
        FILE_PATH: 'Json/my_data.json',
        BRANCH: 'main'
    },
    AUTO_REFRESH: {
        DEFAULT_INTERVAL: 10000
    }
};
/**
 * Utilidades generales para el Dashboard
 */

// Función para obtener el símbolo de moneda
export function getCurrencySymbol() {
    return '$';
}

// Obtener el nombre del mes
export function getMonthName(monthIndex) {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[monthIndex];
}

// Obtener índice del mes a partir del nombre
export function getMonthIndex(monthName) {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months.indexOf(monthName);
}

// Formatear números a moneda
export function formatCurrency(value) {
    return `${getCurrencySymbol()} ${parseFloat(value).toLocaleString('es-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

// Formatear números con separador de miles
export function formatNumber(value) {
    return parseInt(value || 0).toLocaleString('es-ES');
}

// Formatear fecha
export function formatDate(date, options = {}) {
    if (!date) return '';
    const d = (date instanceof Date) ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    const defaultOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    return d.toLocaleString('es-ES', { ...defaultOptions, ...options });
}

// Validar rango de fechas
export function isDateInRange(date, startDate, endDate) {
    const itemDate = new Date(date);
    
    // Normalizar a medianoche en zona horaria local para comparación correcta
    const itemDateOnly = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
    
    if (startDate) {
        let compareStart;
        if (typeof startDate === 'string') {
            // Si es string en formato YYYY-MM-DD (de input HTML type=date)
            const [year, month, day] = startDate.split('-').map(Number);
            compareStart = new Date(year, month - 1, day, 0, 0, 0, 0);
        } else {
            compareStart = new Date(startDate);
            compareStart = new Date(compareStart.getFullYear(), compareStart.getMonth(), compareStart.getDate());
        }
        if (itemDateOnly < compareStart) return false;
    }
    
    if (endDate) {
        let compareEnd;
        if (typeof endDate === 'string') {
            // Si es string en formato YYYY-MM-DD (de input HTML type=date)
            const [year, month, day] = endDate.split('-').map(Number);
            compareEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
        } else {
            compareEnd = new Date(endDate);
            compareEnd = new Date(compareEnd.getFullYear(), compareEnd.getMonth(), compareEnd.getDate(), 23, 59, 59, 999);
        }
        if (itemDateOnly > compareEnd) return false;
    }
    
    return true;
}

// Calcular porcentaje de cambio
export function calculatePercentageChange(current, previous) {
    if (previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
}

// Mostrar notificaciones
export function showAlert(message, type = 'success', duration = 4000) {
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    alert.innerHTML = `
        ${type === 'loading' ? 
            '<i class="fas fa-spinner fa-spin"></i>' : 
            type === 'success' ? 
            '<i class="fas fa-check-circle"></i>' : 
            '<i class="fas fa-exclamation-circle"></i>'}
        <span>${message}</span>
        ${type !== 'loading' ? '<button class="close-alert"><i class="fas fa-times"></i></button>' : ''}
    `;
    
    document.body.appendChild(alert);
    
    if (type !== 'loading') {
        setTimeout(() => {
            alert.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 300);
        }, duration);
    } else {
        alert.classList.add('show');
    }
    
    alert.querySelector('.close-alert')?.addEventListener('click', () => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 300);
    });
    
    return alert;
}

// Descargar archivo
export async function downloadFile(dataUrl, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
}

// Copiar al portapapeles
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Error al copiar al portapapeles:', err);
        return false;
    }
}
/**
 * Módulo de manejo de datos
 */

export class DataManager {
    constructor() {
        this.data = [];
        this.filteredData = [];
    }

    /**
     * Carga los datos desde el archivo JSON
     */
    async loadData() {
        try {
            const response = await fetch('Json/my_data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.data = await response.json();
            
            if (!Array.isArray(this.data)) {
                throw new Error('Datos inválidos: el JSON no es un array');
            }
            
            this.normalizeData();
            this.filteredData = [...this.data];
            return this.data;
        } catch (error) {
            console.error('Error al cargar los datos:', error);
            throw error;
        }
    }

    /**
     * Normaliza la estructura de los datos
     */
    normalizeData() {
        this.data.forEach(item => {
            // Convierte fecha a objeto Date
            item.date = new Date(item.fecha_hora_entrada);
            item.dateStr = formatDate(item.date);
            
            // Parsea el precio
            item.total = parseFloat(item.precio_compra_total) || 0;
            
            // Conteo de productos
            item.productsCount = item.compras.reduce((acc, curr) => acc + (curr.quantity || 0), 0);

            // Mapea propiedades
            item.userType = item.tipo_usuario || 'No especificado';
            item.affiliate = item.afiliado || 'Sin afiliado';
            item.country = item.pais || 'No especificado';
            item.buyerName = item.nombre_comprador || 'Desconocido';
            item.buyerPhone = item.telefono_comprador || 'No especificado';
            item.buyerEmail = item.correo_comprador || 'No especificado';
            item.shippingAddress = item.direccion_envio || 'No especificada';
            item.browser = item.navegador || 'No especificado';
            item.operatingSystem = item.sistema_operativo || 'No especificado';
            item.trafficSource = item.fuente_trafico || 'No especificado';

            // Campo de búsqueda
            item.searchText = `${item.buyerName} ${item.country} ${item.userType} ${item.affiliate} ${item.buyerPhone} ${item.buyerEmail} ${item.shippingAddress} ${item.browser} ${item.operatingSystem} ${item.trafficSource}`.toLowerCase();

            // Origen: normalizar la propiedad especial "buquenqe.com" (si existe)
            // - si la clave existe y es false => no viene desde la web
            // - por defecto tratamos como proveniente de Casa Fresca
            item.isFromBuquenqe = item.hasOwnProperty('buquenqe.com') ? Boolean(item['buquenqe.com']) : true;
            item.sourceLabel = item.isFromBuquenqe ? 'Casa Fresca' : 'Externo';

            // Normaliza productos
            item.compras = item.compras.map(product => {
                const priceBeforeDiscount = product.quantity * product.unitPrice;
                const finalPrice = priceBeforeDiscount * (1 - (product.discount || 0) / 100);
                return {
                    ...product,
                    producto: product.name,
                    precio_unitario: product.unitPrice,
                    precio_total: finalPrice
                };
            });
        });
    }

    /**
     * Filtra los datos por rango de fechas y período
     * Si se especifica un rango de fechas, tiene prioridad sobre el período
     */
    filterByDateRange(startDate = null, endDate = null, period = 'all') {
        const now = new Date();
        let periodStart, periodEnd;
        
        // Normalizar valores vacíos a null
        startDate = startDate && typeof startDate === 'string' && startDate.trim() ? startDate.trim() : null;
        endDate = endDate && typeof endDate === 'string' && endDate.trim() ? endDate.trim() : null;
        
        let hasDateRange = startDate || endDate;
        
        // Si se especifica un rango de fechas, usarlo directamente sin período
        if (hasDateRange) {
            periodStart = null;
            periodEnd = null;
        } else {
            // Solo aplicar período si NO hay rango de fechas especificado
            switch (period) {
                case 'month':
                    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    periodEnd.setHours(23, 59, 59, 999);
                    break;
                case 'last-month':
                    periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    periodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                    periodEnd.setHours(23, 59, 59, 999);
                    break;
                case 'year':
                    periodStart = new Date(now.getFullYear(), 0, 1);
                    periodEnd = new Date(now.getFullYear(), 11, 31);
                    periodEnd.setHours(23, 59, 59, 999);
                    break;
                default:
                    periodStart = null;
                    periodEnd = null;
            }
        }
        
        this.filteredData = this.data.filter(item => {
            const itemDate = item.date;
            
            // Verificar rango de fechas: comparar usando fechas completas (Date objects)
            // Normalizar las fechas a medianoche para comparación correcta
            let dateInRange = true;
            
            if (startDate) {
                try {
                    // Parsear startDate (formato YYYY-MM-DD desde input HTML)
                    const parts = startDate.split('-');
                    if (parts.length === 3) {
                        const year = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10);
                        const day = parseInt(parts[2], 10);
                        const rangeStart = new Date(year, month - 1, day, 0, 0, 0, 0);
                        dateInRange = itemDate >= rangeStart;
                    }
                } catch (e) {
                    console.warn('Error al parsear startDate:', startDate, e);
                    dateInRange = true; // Si hay error, permitir el item
                }
            }
            
            if (endDate && dateInRange) {
                try {
                    // Parsear endDate (formato YYYY-MM-DD desde input HTML)
                    const parts = endDate.split('-');
                    if (parts.length === 3) {
                        const year = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10);
                        const day = parseInt(parts[2], 10);
                        const rangeEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
                        dateInRange = itemDate <= rangeEnd;
                    }
                } catch (e) {
                    console.warn('Error al parsear endDate:', endDate, e);
                    dateInRange = true; // Si hay error, permitir el item
                }
            }
            
            // Verificar período
            const periodInRange =
                !periodStart ||
                (itemDate >= periodStart && itemDate <= periodEnd);
            
            // Debug logs (comentar después de verificar)
            // console.log(`Item: ${item.dateStr} | DateInRange: ${dateInRange} | PeriodInRange: ${periodInRange}`);
            
            // Si hay rango de fechas, ignora el período; si no, aplica el período
            if (hasDateRange) {
                return dateInRange;
            } else {
                return dateInRange && periodInRange;
            }
        });
        
        return this.filteredData;
    }

    /**
     * Filtra por múltiples criterios: fechas, país, afiliado, tipo usuario, navegador, OS, rango de precio y si contiene compra
     */
    filterByCriteria({ startDate = null, endDate = null, period = 'all', country = 'all', affiliate = 'all', userType = 'all', browser = 'all', os = 'all', minTotal = null, maxTotal = null, hasPurchase = 'all' } = {}) {
        // Primero filtrar por rango/periodo usando la función existente
        this.filterByDateRange(startDate, endDate, period);

        this.filteredData = this.filteredData.filter(item => {
            if (country && country !== 'all' && (item.country || '').toLowerCase() !== (country || '').toLowerCase()) return false;
            if (affiliate && affiliate !== 'all' && (item.affiliate || '').toLowerCase() !== (affiliate || '').toLowerCase()) return false;
            if (userType && userType !== 'all' && (item.userType || '').toLowerCase() !== (userType || '').toLowerCase()) return false;
            if (browser && browser !== 'all' && (item.browser || '').toLowerCase() !== (browser || '').toLowerCase()) return false;
            if (os && os !== 'all' && (item.operatingSystem || '').toLowerCase() !== (os || '').toLowerCase()) return false;

            if (minTotal !== null && minTotal !== '' && !isNaN(Number(minTotal))) {
                if ((item.total || 0) < Number(minTotal)) return false;
            }
            if (maxTotal !== null && maxTotal !== '' && !isNaN(Number(maxTotal))) {
                if ((item.total || 0) > Number(maxTotal)) return false;
            }

            if (hasPurchase === 'with') {
                if (!Array.isArray(item.compras) || item.compras.length === 0) return false;
            } else if (hasPurchase === 'without') {
                if (Array.isArray(item.compras) && item.compras.length > 0) return false;
            }

            return true;
        });

        return this.filteredData;
    }

    /**
     * Busca en los datos
     */
    search(searchTerm) {
        const term = searchTerm.toLowerCase();
        this.filteredData = this.data.filter(item =>
            item.searchText.includes(term)
        );
        return this.filteredData;
    }

    /**
     * Filtra por tipo de transacción (afiliado/directo)
     */
    filterByTransactionType(type = 'all') {
        if (type === 'affiliated') {
            return this.filteredData.filter(order => 
                order.afiliado && order.afiliado !== 'Sin afiliado'
            );
        } else if (type === 'direct') {
            return this.filteredData.filter(order => 
                !order.afiliado || order.afiliado === 'Sin afiliado'
            );
        }
        return this.filteredData;
    }

    /**
     * Calcula estadísticas generales
     */
    getStats(data = this.filteredData) {
        const totalSales = data.reduce((acc, order) => acc + (order.total || 0), 0);
        const avgOrderValue = data.length > 0 ? totalSales / data.length : 0;
        const totalProducts = data.reduce((acc, order) => acc + (order.productsCount || 0), 0);
        const uniqueCustomers = new Set(data.map(order => order.correo_comprador).filter(Boolean)).size;

        return {
            totalSales,
            avgOrderValue,
            totalProducts,
            totalOrders: data.length,
            uniqueCustomers
        };
    }

    /**
     * Obtiene datos mensuales comparativos
     */
    getMonthlyComparison(data = this.data) {
        const monthlyData = {};
        const currentYear = new Date().getFullYear();
        
        for (let month = 0; month < 12; month++) {
            const key = `${currentYear}-${month}`;
            monthlyData[key] = {
                month: getMonthName(month),
                orders: 0,
                sales: 0,
                products: 0,
                hasData: false
            };
        }
        
        data.forEach(order => {
            const orderDate = order.date;
            const year = orderDate.getFullYear();
            const month = orderDate.getMonth();
            
            if (year === currentYear) {
                const key = `${year}-${month}`;
                monthlyData[key].orders++;
                monthlyData[key].sales += order.total || 0;
                monthlyData[key].products += order.productsCount || 0;
                monthlyData[key].hasData = true;
            }
        });
        
        return Object.values(monthlyData).sort((a, b) => {
            const monthA = getMonthIndex(a.month);
            const monthB = getMonthIndex(b.month);
            return monthA - monthB;
        });
    }

    /**
     * Obtiene los productos más vendidos
     */
    getTopProducts(data = this.filteredData, limit = 10) {
        const products = data.reduce((acc, order) => {
            order.compras.forEach(product => {
                acc[product.name] = (acc[product.name] || 0) + product.quantity;
            });
            return acc;
        }, {});

        return Object.entries(products)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([product, quantity]) => ({ product, quantity }));
    }

    /**
     * Obtiene la tendencia de ventas por día
     */
    getSalesTrend(data = this.filteredData) {
        const dailySales = data.reduce((acc, order) => {
            const dateStr = order.date.toISOString().split('T')[0];
            acc[dateStr] = (acc[dateStr] || 0) + order.total;
            return acc;
        }, {});

        return Object.entries(dailySales)
            .map(([date, total]) => ({ date, total }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    /**
     * Obtiene resumen diario (hoy y ayer)
     */
    getDailySummary() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
    
        const todayOrders = this.data.filter(order => {
            const orderDate = new Date(order.date.getFullYear(), order.date.getMonth(), order.date.getDate());
            return orderDate.getTime() === today.getTime();
        });
    
        const yesterdayOrders = this.data.filter(order => {
            const orderDate = new Date(order.date.getFullYear(), order.date.getMonth(), order.date.getDate());
            return orderDate.getTime() === yesterday.getTime();
        });
    
        const todaySales = todayOrders.reduce((sum, order) => sum + order.total, 0);
        const yesterdaySales = yesterdayOrders.reduce((sum, order) => sum + order.total, 0);
    
        let salesChange = "N/A";
        let salesChangeClass = "";
        if (yesterdaySales > 0) {
            const change = ((todaySales - yesterdaySales) / yesterdaySales * 100).toFixed(1);
            salesChange = `${change}%`;
            salesChangeClass = change >= 0 ? 'positive' : 'negative';
        }

        return {
            todaySales,
            todayOrders: todayOrders.length,
            yesterdaySales,
            yesterdayOrders: yesterdayOrders.length,
            salesChange,
            salesChangeClass
        };
    }
}
/**
 * Motor de Base de Datos Local (Staging Engine)
 * Gestiona IndexedDB para almacenar imágenes en Base64
 * y localStorage para metadatos de cambios
 */

export class StagingDB {
    constructor(dbName = 'CasaFrescaInventoryStaging', version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
        this.STORES = {
            IMAGES: 'staging_images',
            METADATA: 'staging_metadata'
        };
    }

    /**
     * Inicializa la base de datos IndexedDB
     */
    async initStagingDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('Error al abrir IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB inicializada correctamente');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Crear almacén para imágenes
                if (!db.objectStoreNames.contains(this.STORES.IMAGES)) {
                    db.createObjectStore(this.STORES.IMAGES, { keyPath: 'key' });
                }

                // Crear almacén para metadatos
                if (!db.objectStoreNames.contains(this.STORES.METADATA)) {
                    db.createObjectStore(this.STORES.METADATA, { keyPath: 'key' });
                }
            };
        });
    }

    /**
     * Guarda una imagen en Base64 a IndexedDB
     * @param {string} key - Identificador único de la imagen
     * @param {string} base64Data - Datos Base64 de la imagen (sin prefijo "data:image...")
     * @returns {Promise}
     */
    async saveImageToIDB(key, base64Data) {
        if (!this.db) await this.initStagingDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.IMAGES], 'readwrite');
            const store = transaction.objectStore(this.STORES.IMAGES);

            const imageData = {
                key,
                base64: base64Data,
                timestamp: Date.now(),
                mimeType: 'image/jpeg' // Por defecto, puede detectarse del archivo original
            };

            const request = store.put(imageData);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                console.log(`Imagen guardada en IDB: ${key}`);
                resolve(imageData);
            };
        });
    }

    /**
     * Obtiene una imagen de IndexedDB
     * @param {string} key - Identificador de la imagen
     * @returns {Promise<Object|null>}
     */
    async getImageFromIDB(key) {
        if (!this.db) await this.initStagingDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.IMAGES], 'readonly');
            const store = transaction.objectStore(this.STORES.IMAGES);
            const request = store.get(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                resolve(request.result || null);
            };
        });
    }

    /**
     * Elimina una imagen de IndexedDB
     * @param {string} key - Identificador de la imagen
     * @returns {Promise}
     */
    async deleteImageFromIDB(key) {
        if (!this.db) await this.initStagingDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.IMAGES], 'readwrite');
            const store = transaction.objectStore(this.STORES.IMAGES);
            const request = store.delete(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                console.log(`Imagen eliminada de IDB: ${key}`);
                resolve();
            };
        });
    }

    /**
     * Obtiene todas las imágenes en staging
     * @returns {Promise<Array>}
     */
    async getAllStagingImages() {
        if (!this.db) await this.initStagingDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.IMAGES], 'readonly');
            const store = transaction.objectStore(this.STORES.IMAGES);
            const request = store.getAll();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    /**
     * Limpia todas las imágenes de IndexedDB
     * @returns {Promise}
     */
    async clearAllImages() {
        if (!this.db) await this.initStagingDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.IMAGES], 'readwrite');
            const store = transaction.objectStore(this.STORES.IMAGES);
            const request = store.clear();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                console.log('Todas las imágenes han sido eliminadas de IDB');
                resolve();
            };
        });
    }

    /**
     * Guarda metadatos en IDB
     * @param {string} key - Identificador del metadato
     * @param {Object} data - Datos a guardar
     * @returns {Promise}
     */
    async saveMetadata(key, data) {
        if (!this.db) await this.initStagingDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.METADATA], 'readwrite');
            const store = transaction.objectStore(this.STORES.METADATA);

            const metadata = {
                key,
                data,
                timestamp: Date.now()
            };

            const request = store.put(metadata);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(metadata);
        });
    }

    /**
     * Obtiene metadatos de IDB
     * @param {string} key - Identificador del metadato
     * @returns {Promise<Object|null>}
     */
    async getMetadata(key) {
        if (!this.db) await this.initStagingDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.METADATA], 'readonly');
            const store = transaction.objectStore(this.STORES.METADATA);
            const request = store.get(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result || null);
        });
    }

    /**
     * Limpia todos los metadatos de IDB
     * @returns {Promise}
     */
    async clearAllMetadata() {
        if (!this.db) await this.initStagingDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.METADATA], 'readwrite');
            const store = transaction.objectStore(this.STORES.METADATA);
            const request = store.clear();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                console.log('Todos los metadatos han sido eliminados de IDB');
                resolve();
            };
        });
    }
}
