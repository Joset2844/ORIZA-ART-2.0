// ============================================
// PANEL DE ADMINISTRACIÓN COMPLETO — ORIZA ART
// ============================================

const SESSION_KEY = "orizaAdminPass";

window.productosAdmin = window.productosAdmin || [];
window.productosFiltrados = window.productosFiltrados || [];
window.dbSchema = null;
let editandoId = null;
let ordenActual = { columna: null, ascendente: true };

// Sanitización para prevenir XSS en renders dinámicos
function escapeHTML(str = "") {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function mostrarErrorLogin(msg) {
    const el = document.getElementById("login-error");
    if (el) { el.textContent = msg; el.hidden = false; }
}

function mostrarPanel() {
    document.getElementById("loader-vista")?.setAttribute("hidden", "");
    document.getElementById("login-vista")?.setAttribute("hidden", "");
    document.getElementById("panel-vista")?.removeAttribute("hidden");
}

// Emite un evento global para avisar a otras pestañas/componentes
function notificarCambioCatalogo() {
    sessionStorage.removeItem("oriza_productos_cache");
    window.dispatchEvent(new CustomEvent("catalog:updated"));
}

// Cargar productos desde Supabase y detectar esquema dinámico
async function recargarProductos() {
    if (typeof supabaseClient === "undefined") {
        console.error("supabaseClient no está inicializado.");
        return;
    }

    try {
        const { data, error } = await supabaseClient.from('productos').select('*');

        if (error) {
            mostrarToast("Error al cargar productos: " + error.message, "error");
            return;
        }

        if (data && data.length > 0 && !window.dbSchema) {
            const row = data[0];
            window.dbSchema = {
                id: 'codigo' in row ? 'codigo' : ('ID' in row ? 'ID' : ('id_codigo' in row ? 'id_codigo' : 'id')),
                nombre: 'NOMBRE' in row ? 'NOMBRE' : 'nombre',
                tipo: 'TIPO' in row ? 'TIPO' : 'tipo',
                precio: 'PRECIO' in row ? 'PRECIO' : 'precio',
                stock: 'STOCK' in row ? 'STOCK' : 'stock',
                estado: 'ESTADO' in row ? 'ESTADO' : 'estado',
                destacado: 'DESTACADO' in row ? 'DESTACADO' : 'destacado',
                material: 'MATERIAL' in row ? 'MATERIAL' : 'material',
                descripcion: 'DESCRIPCION ESPIRITUAL' in row ? 'DESCRIPCION ESPIRITUAL' : 'descripcion',
                imagen: 'VACIO' in row ? 'VACIO' : 'imagen',
                orden: 'ORDEN' in row ? 'ORDEN' : 'orden'
            };
        }

        window.productosAdmin = (data || []).map(r => ({
            id: r[window.dbSchema.id]?.toString() || "",
            nombre: r[window.dbSchema.nombre]?.toString() || "",
            tipo: r[window.dbSchema.tipo]?.toString() || "PULSERA",
            precio: Number(r[window.dbSchema.precio] ?? 0),
            stock: Number(r[window.dbSchema.stock] ?? 0),
            estado: r[window.dbSchema.estado]?.toString() || "ACTIVO",
            destacado: r[window.dbSchema.destacado]?.toString() || "NO",
            material: r[window.dbSchema.material]?.toString() || "",
            descripcion: r[window.dbSchema.descripcion]?.toString() || "",
            imagen: r[window.dbSchema.imagen]?.toString() || "",
            orden: Number(r[window.dbSchema.orden] ?? 999)
        }));

        window.productosFiltrados = [...window.productosAdmin];
        aplicarFiltros(false);
    } catch (e) {
        console.error("Excepción en recargarProductos:", e);
    }
}

// Renderizar tabla utilizando DocumentFragment para máximo rendimiento
function renderizarTabla() {
    const tbody = document.getElementById("tabla-productos");
    if (!tbody) return;

    if (!window.productosFiltrados.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="tabla-vacia">No hay productos registrados.</td></tr>`;
        return;
    }

    const fragment = document.createDocumentFragment();

    window.productosFiltrados.forEach(p => {
        const activo = (p.estado || "").toLowerCase() === "activo";
        const defaultBucket = typeof IMAGEN_DEFAULT_BUCKET !== "undefined" ? IMAGEN_DEFAULT_BUCKET : "";
        
        let fotoTabla = defaultBucket;
        if (p.imagen && p.imagen.startsWith("http")) {
            fotoTabla = p.imagen.split(",")[0].trim();
        } else if (p.id) {
            fotoTabla = `${SUPABASE_STORAGE_URL}/${p.id}.webp`;
        }

        const tr = document.createElement("tr");
        if (!activo) tr.className = "fila-inactiva";

        tr.innerHTML = `
            <td>${escapeHTML(p.id)}</td>
            <td>
                <div class="producto-admin">
                    <img src="${escapeHTML(fotoTabla)}" loading="lazy" onerror="this.onerror=null; this.src='${escapeHTML(defaultBucket)}';">
                    <div>
                        <strong>${escapeHTML(p.nombre)}</strong>
                        <small>${escapeHTML(p.id)}</small>
                    </div>
                </div>
            </td>
            <td>${escapeHTML(p.tipo)}</td>
            <td>S/ ${Number(p.precio).toFixed(2)}</td>
            <td>
                <div class="stock-box">
                    <input type="number" min="0" class="input-stock" data-id="${escapeHTML(p.id)}" value="${p.stock}">
                </div>
            </td>
            <td>
                <button type="button" class="badge-estado ${activo ? "activo" : "inactivo"}" data-accion="toggle-estado" data-id="${escapeHTML(p.id)}">
                    ${activo ? "Activo" : "Inactivo"}
                </button>
            </td>
            <td class="acciones-tabla">
                <button type="button" data-accion="editar" data-id="${escapeHTML(p.id)}" title="Editar">✎</button>
                <button type="button" data-accion="eliminar" data-id="${escapeHTML(p.id)}" title="Eliminar" style="color:red;">🗑</button>
            </td>
        `;
        fragment.appendChild(tr);
    });

    tbody.innerHTML = "";
    tbody.appendChild(fragment);
}

// Sistema de ordenamiento por columnas
function ordenarDatos(colIndex, tipo) {
    if (ordenActual.columna === colIndex) {
        ordenActual.ascendente = !ordenActual.ascendente;
    } else {
        ordenActual.columna = colIndex;
        ordenActual.ascendente = true;
    }

    const mapaColumnas = { 0: "id", 1: "nombre", 2: "tipo", 3: "precio", 4: "stock", 5: "estado" };
    const prop = mapaColumnas[colIndex];
    if (!prop) return;

    window.productosFiltrados.sort((a, b) => {
        let valA = a[prop];
        let valB = b[prop];

        if (tipo === "num" || tipo === "precio") {
            valA = Number(valA) || 0;
            valB = Number(valB) || 0;
            return ordenActual.ascendente ? valA - valB : valB - valA;
        } else {
            valA = valA.toString().toLowerCase();
            valB = valB.toString().toLowerCase();
            if (valA < valB) return ordenActual.ascendente ? -1 : 1;
            if (valA > valB) return ordenActual.ascendente ? 1 : -1;
            return 0;
        }
    });

    document.querySelectorAll("th[data-col]").forEach(th => {
        const icon = th.querySelector(".sort-icon");
        if (icon) icon.textContent = "↕";
    });

    const activeTh = document.querySelector(`th[data-col="${colIndex}"]`);
    if (activeTh) {
        const icon = activeTh.querySelector(".sort-icon");
        if (icon) icon.textContent = ordenActual.ascendente ? "↑" : "↓";
    }

    renderizarTabla();
}

function aplicarFiltros(resetearOrden = true) {
    const texto = (document.getElementById("buscar-producto")?.value || "").trim().toLowerCase();
    const tipo = document.getElementById("filtro-tipo")?.value || "";
    const estado = document.getElementById("filtro-estado")?.value || "";

    window.productosFiltrados = window.productosAdmin.filter(p => {
        const coincideTexto = p.nombre.toLowerCase().includes(texto) || p.id.toLowerCase().includes(texto);
        const coincideTipo = !tipo || p.tipo === tipo;
        const coincideEstado = !estado || p.estado === estado;
        return coincideTexto && coincideTipo && coincideEstado;
    });

    if (!resetearOrden && ordenActual.columna !== null) {
        const tempAsc = ordenActual.ascendente;
        ordenActual.ascendente = !tempAsc;
        ordenarDatos(ordenActual.columna, document.querySelector(`th[data-col="${ordenActual.columna}"]`)?.dataset.tipo);
    } else {
        renderizarTabla();
    }
}

// Operaciones DB y Archivos
async function guardarFormulario(e) {
    e.preventDefault();
    if (!window.dbSchema) return mostrarToast("Espera a que cargue la base de datos.", "error");

    const id = document.getElementById("f-id").value.trim().toUpperCase();
    if (!id) return mostrarToast("El ID es obligatorio.", "error");

    const inputPrincipal = document.getElementById("f-imagen-principal");
    const inputArchivo = document.getElementById("f-imagen-file");
    let urlImagen = document.getElementById("f-imagen").value.trim();

    try {
        const archivoPrincipal = (inputPrincipal && inputPrincipal.files.length > 0) ? inputPrincipal.files[0] : null;
        const archivosOtras = (inputArchivo && inputArchivo.files.length > 0) ? Array.from(inputArchivo.files) : [];

        if (archivoPrincipal || archivosOtras.length > 0) {
            const total = (archivoPrincipal ? 1 : 0) + archivosOtras.length;
            mostrarToast(`Subiendo ${total} imagen(es)...`, "info");

            const nuevasUrls = await subirImagenesSupabase(id, {
                principal: archivoPrincipal,
                otras: archivosOtras
            });

            if (!archivoPrincipal && urlImagen) {
                const urlPrincipalExistente = urlImagen.split(",")[0].trim();
                urlImagen = [urlPrincipalExistente, nuevasUrls].filter(Boolean).join(",");
            } else {
                urlImagen = nuevasUrls;
            }
        }

        const payload = {};
        payload[window.dbSchema.id] = id;
        payload[window.dbSchema.tipo] = document.getElementById("f-tipo").value;
        payload[window.dbSchema.nombre] = document.getElementById("f-nombre").value.trim();
        payload[window.dbSchema.precio] = Number(document.getElementById("f-precio").value || 0);
        payload[window.dbSchema.material] = document.getElementById("f-material").value.trim();
        payload[window.dbSchema.descripcion] = document.getElementById("f-descripcion").value.trim();
        payload[window.dbSchema.imagen] = urlImagen;
        payload[window.dbSchema.estado] = document.getElementById("f-estado").value;
        payload[window.dbSchema.destacado] = document.getElementById("f-destacado").value;
        payload[window.dbSchema.orden] = Number(document.getElementById("f-orden").value || 999);
        payload[window.dbSchema.stock] = Number(document.getElementById("f-stock").value || 0);

        let error;
        if (editandoId) {
            const res = await supabaseClient.from('productos').update(payload).eq(window.dbSchema.id, editandoId);
            error = res.error;
        } else {
            const { data: maxResult, error: maxError } = await supabaseClient
                .from('productos')
                .select('N°')
                .order('N°', { ascending: false })
                .limit(1);

            let maxN = (!maxError && maxResult && maxResult.length > 0) ? Number(maxResult[0]['N°'] || 0) : window.productosAdmin.length;
            payload["N°"] = maxN + 1;

            const res = await supabaseClient.from('productos').insert([payload]);
            error = res.error;
        }

        if (error) throw error;

        notificarCambioCatalogo();
        mostrarToast(editandoId ? "Producto actualizado correctamente" : "Producto creado correctamente", "exito");
        
        if (inputPrincipal) inputPrincipal.value = "";
        if (inputArchivo) inputArchivo.value = "";
        
        cerrarFormulario();
        await recargarProductos();
    } catch (err) {
        mostrarToast("Error: " + err.message, "error");
    }
}

function convertirImagenAWebp(file, calidad = 0.85) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            canvas.toBlob(
                (blob) => {
                    URL.revokeObjectURL(objectUrl);
                    if (!blob) return reject(new Error(`No se pudo convertir "${file.name}" a WEBP.`));
                    resolve(blob);
                },
                'image/webp',
                calidad
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error(`Error leyendo la imagen "${file.name}".`));
        };

        img.src = objectUrl;
    });
}

async function subirImagenesSupabase(idProducto, { principal = null, otras = [] } = {}) {
    const BUCKET_NAME = 'productos';
    const urlsGuardadas = [];

    const subirUnaImagen = async (file, filePath, indiceLog, totalLog) => {
        console.log(`Convirtiendo y subiendo imagen ${indiceLog} de ${totalLog}:`, filePath);

        const blobWebp = await convertirImagenAWebp(file);
        const { error } = await supabaseClient
            .storage
            .from(BUCKET_NAME)
            .upload(filePath, blobWebp, {
                cacheControl: '3600',
                upsert: true,
                contentType: 'image/webp'
            });

        if (error) {
            console.error(`Error subiendo la imagen ${file.name}:`, error);
            throw new Error(`Error en imagen ${indiceLog}: ` + error.message);
        }

        const { data: urlData } = supabaseClient
            .storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

        // Mantiene tu estrategia para forzar la actualización de caché en CDN
        return `${urlData.publicUrl}?v=${Date.now()}`;
    };

    const totalLog = (principal ? 1 : 0) + otras.length;
    let indiceLog = 1;

    if (principal) {
        urlsGuardadas.push(await subirUnaImagen(principal, `${idProducto}.webp`, indiceLog, totalLog));
        indiceLog++;
    }

    for (let i = 0; i < otras.length; i++) {
        urlsGuardadas.push(await subirUnaImagen(otras[i], `${idProducto}-${i + 2}.webp`, indiceLog, totalLog));
        indiceLog++;
    }

    return urlsGuardadas.join(',');
}

async function eliminarProducto(id) {
    if (!confirm(`¿Estás seguro de eliminar el producto ${id}?`)) return;
    try {
        const { error } = await supabaseClient.from('productos').delete().eq(window.dbSchema.id, id);
        if (error) throw error;
        
        notificarCambioCatalogo();
        mostrarToast("Producto eliminado", "exito");
        await recargarProductos();
    } catch (err) { mostrarToast("Error al eliminar", "error"); }
}

async function actualizarStockRapido(id, nuevoStock) {
    if (!window.dbSchema) return;
    try {
        const payload = {}; payload[window.dbSchema.stock] = Number(nuevoStock);
        const { error } = await supabaseClient.from('productos').update(payload).eq(window.dbSchema.id, id);
        if (error) throw error;
        
        notificarCambioCatalogo();
        mostrarToast("Stock actualizado correctamente", "exito");
        const p = window.productosAdmin.find(x => x.id === id);
        if (p) p.stock = Number(nuevoStock);
    } catch (err) { mostrarToast("Error al actualizar stock", "error"); }
}

async function toggleEstado(id) {
    if (!window.dbSchema) return;
    const prod = window.productosAdmin.find(p => p.id === id);
    if (!prod) return;
    
    const nuevoEstado = prod.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    const payload = {}; payload[window.dbSchema.estado] = nuevoEstado;
    
    try {
        const { error } = await supabaseClient.from('productos').update(payload).eq(window.dbSchema.id, id);
        if (error) throw error;
        
        notificarCambioCatalogo();
        mostrarToast(`Estado cambiado a ${nuevoEstado}`, "exito");
        await recargarProductos();
    } catch (err) { mostrarToast("Error al cambiar estado", "error"); }
}

async function iniciarSesion(usuario, password) {
    try {
        const { data, error } = await supabaseClient.from('usuarios')
            .select('*').ilike('usuario', usuario.trim()).eq('password', password.trim()).maybeSingle();
            
        if (error || !data) {
            mostrarErrorLogin("Usuario o contraseña incorrectos.");
            return false;
        }
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ usuario: data.usuario, id: data.id }));
        mostrarPanel();
        await recargarProductos();
        return true;
    } catch (err) { return false; }
}

function abrirFormulario(producto = null) {
    editandoId = producto ? producto.id : null;
    const overlay = document.getElementById("form-overlay");
    if (!overlay) return;

    document.getElementById("form-titulo").textContent = editandoId ? `Editar: ${editandoId}` : "Nuevo producto";
    const inputId = document.getElementById("f-id");
    inputId.value = producto?.id || "";
    inputId.disabled = !!editandoId; 

    document.getElementById("f-tipo").value = producto?.tipo || "PULSERA";
    document.getElementById("f-nombre").value = producto?.nombre || "";
    document.getElementById("f-precio").value = producto?.precio || "";
    document.getElementById("f-material").value = producto?.material || "";
    document.getElementById("f-descripcion").value = producto?.descripcion || "";
    document.getElementById("f-imagen").value = producto?.imagen || "";
    document.getElementById("f-estado").value = producto?.estado || "ACTIVO";
    document.getElementById("f-destacado").value = producto?.destacado || "NO";
    document.getElementById("f-orden").value = producto?.orden || "";
    document.getElementById("f-stock").value = producto?.stock ?? 0;

    const inputImagenPrincipal = document.getElementById("f-imagen-principal");
    const inputImagenFile = document.getElementById("f-imagen-file");
    if (inputImagenPrincipal) inputImagenPrincipal.value = "";
    if (inputImagenFile) inputImagenFile.value = "";

    actualizarPreview();
    overlay.hidden = false;
}

function cerrarFormulario() {
    const overlay = document.getElementById("form-overlay");
    if (overlay) overlay.hidden = true;
    editandoId = null;
}

function actualizarPreview() {
    const id = document.getElementById("f-id")?.value;
    const nombre = document.getElementById("f-nombre")?.value || "Nombre del producto";
    const precio = Number(document.getElementById("f-precio")?.value || 0).toFixed(2);
    const tipo = document.getElementById("f-tipo")?.value || "PULSERA";
    const material = document.getElementById("f-material")?.value || "Perlas, Hilo de nylon";
    const descripcion = document.getElementById("f-descripcion")?.value || "Descripción detallada del producto...";
    const stock = Number(document.getElementById("f-stock")?.value || 0);
    const destacado = document.getElementById("f-destacado")?.value;
    const img = document.getElementById("f-imagen")?.value;
    const inputImagenPrincipal = document.getElementById("f-imagen-principal");
    const inputImagenFile = document.getElementById("f-imagen-file");

    if (document.getElementById("preview-nombre")) document.getElementById("preview-nombre").textContent = nombre;
    if (document.getElementById("preview-precio")) document.getElementById("preview-precio").textContent = `S/ ${precio}`;
    if (document.getElementById("preview-tipo")) document.getElementById("preview-tipo").textContent = tipo;
    if (document.getElementById("preview-material")) document.getElementById("preview-material").textContent = `Materiales: ${material}`;
    if (document.getElementById("preview-descripcion")) document.getElementById("preview-descripcion").textContent = descripcion;

    const elStock = document.getElementById("preview-stock");
    if (elStock) {
        if (stock <= 0) {
            elStock.textContent = "Agotado";
            elStock.className = "preview-stock agotado";
        } else {
            elStock.textContent = stock <= 3 ? `¡Últimas ${stock} unidades!` : "Disponible";
            elStock.className = "preview-stock disponible";
        }
    }

    const elDestacado = document.getElementById("preview-destacado");
    if (elDestacado) elDestacado.hidden = destacado !== "SI";

    const prevImg = document.getElementById("preview-img");
    if (prevImg) {
        if (inputImagenPrincipal?.files?.[0]) {
            prevImg.src = URL.createObjectURL(inputImagenPrincipal.files[0]);
        } else if (inputImagenFile?.files?.[0]) {
            prevImg.src = URL.createObjectURL(inputImagenFile.files[0]);
        } else if (img && img.trim() !== "") {
            prevImg.src = img.split(",")[0].trim();
        } else if (id && id.trim() !== "") {
            prevImg.src = `${SUPABASE_STORAGE_URL}/${id.trim().toUpperCase()}.webp`;
        } else if (typeof IMAGEN_DEFAULT_BUCKET !== "undefined") {
            prevImg.src = IMAGEN_DEFAULT_BUCKET;
        }
    }
}

function mostrarToast(mensaje, tipo = "info") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.className = `mostrar ${tipo}`;
    toast.textContent = mensaje;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { toast.className = ""; }, 3000);
}

// Event Listeners unificados
document.addEventListener("DOMContentLoaded", () => {
    if (sessionStorage.getItem(SESSION_KEY)) {
        mostrarPanel();
        recargarProductos();
    }

    document.getElementById("login-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        iniciarSesion(document.getElementById("login-user").value, document.getElementById("login-password").value);
    });

    document.getElementById("btn-cerrar-sesion")?.addEventListener("click", () => { sessionStorage.clear(); location.reload(); });
    document.getElementById("btn-nuevo")?.addEventListener("click", () => abrirFormulario(null));
    document.getElementById("form-cerrar")?.addEventListener("click", cerrarFormulario);
    document.getElementById("form-producto")?.addEventListener("submit", guardarFormulario);

    // Delegación de eventos en la tabla
    document.getElementById("tabla-productos")?.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-accion]");
        if (!btn) return;
        const id = btn.dataset.id;
        const accion = btn.dataset.accion;

        if (accion === "editar") abrirFormulario(window.productosAdmin.find(p => p.id === id));
        else if (accion === "eliminar") eliminarProducto(id);
        else if (accion === "toggle-estado") toggleEstado(id);
    });

    document.getElementById("tabla-productos")?.addEventListener("change", (e) => {
        if (e.target.classList.contains("input-stock")) {
            actualizarStockRapido(e.target.dataset.id, e.target.value);
        }
    });

    document.querySelectorAll("th[data-col]").forEach(th => {
        th.style.cursor = "pointer";
        th.addEventListener("click", () => ordenarDatos(parseInt(th.dataset.col), th.dataset.tipo));
    });

    document.getElementById("buscar-producto")?.addEventListener("input", () => aplicarFiltros(true));
    document.getElementById("filtro-tipo")?.addEventListener("change", () => aplicarFiltros(true));
    document.getElementById("filtro-estado")?.addEventListener("change", () => aplicarFiltros(true));

    // Listeners del Formulario (se agregan 1 sola vez en el DOMContentLoaded)
    const manejadorPreview = (e) => {
        const prevImg = document.getElementById("preview-img");
        if (e.target.type === "file" && e.target.files?.[0] && prevImg) {
            prevImg.src = URL.createObjectURL(e.target.files[0]);
        }
        actualizarPreview();
    };

    document.querySelectorAll("#form-producto input, #form-producto select, #form-producto textarea").forEach(el => {
        el.addEventListener("input", manejadorPreview);
        el.addEventListener("change", manejadorPreview);
    });
});