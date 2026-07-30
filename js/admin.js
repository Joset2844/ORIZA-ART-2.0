// ============================================
// PANEL DE ADMINISTRACIÓN COMPLETO — ORIZA ART
// ============================================

const SESSION_KEY = "orizaAdminPass";

window.productosAdmin = window.productosAdmin || [];
window.productosFiltrados = window.productosFiltrados || [];

// Mapeo exacto según las columnas en MAYÚSCULAS de tu Supabase
window.dbSchema = {
    id: 'ID',
    tipo: 'TIPO',
    nombre: 'NOMBRE',
    precio: 'PRECIO',
    material: 'MATERIAL',
    descripcion: 'DESCRIPCION ESPIRITUAL',
    estado: 'ESTADO',
    destacado: 'DESTACADO',
    orden: 'ORDEN',
    stock: 'STOCK',
    imagen: 'VACIO' // O la columna donde guardes la URL de la imagen
};

let editandoId = null;
let ordenActual = { columna: null, ascendente: true };
let seleccionados = new Set();
let imagenesSeleccionadas = [];

// Sanitización XSS
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

function notificarCambioCatalogo() {
    sessionStorage.removeItem("oriza_productos_cache");
    window.dispatchEvent(new CustomEvent("catalog:updated"));
}

// Cargar productos desde Supabase
let paginaActual = 1;
const LIMITE_POR_PAGINA = 15;
let totalProductosBD = 0;

async function recargarProductos(pagina = 1) {
    if (typeof supabaseClient === "undefined") return;

    paginaActual = pagina;
    const desde = (paginaActual - 1) * LIMITE_POR_PAGINA;
    const hasta = desde + LIMITE_POR_PAGINA - 1;

    try {
        let query = supabaseClient
            .from('productos')
            .select('*', { count: 'exact' })
            .range(desde, hasta);

        // Ordenamiento seguro (evitando caracteres especiales en el endpoint de Supabase)
        if (window.dbSchema?.orden && !window.dbSchema.orden.includes('°')) {
            query = query.order(window.dbSchema.orden, { ascending: true });
        } else if (window.dbSchema?.id && !window.dbSchema.id.includes('°')) {
            query = query.order(window.dbSchema.id, { ascending: true });
        }

        const { data, error, count } = await query;

        if (error) throw error;

        totalProductosBD = count || 0;

        // Función auxiliar para buscar el valor de una clave sin importar mayúsculas/minúsculas/acentos
        const obtenerValor = (row, ...clavesPosibles) => {
            const keysObj = Object.keys(row);
            for (const clave of clavesPosibles) {
                // Busqueda exacta
                if (row[clave] !== undefined) return row[clave];
                // Busqueda insensible a mayúsculas/minúsculas
                const keyEncontrada = keysObj.find(k => k.toLowerCase() === clave.toLowerCase());
                if (keyEncontrada && row[keyEncontrada] !== undefined) return row[keyEncontrada];
            }
            return null;
        };

        window.productosAdmin = (data || []).map(r => {
        const idVal = (obtenerValor(r, 'ID', 'id', 'N°') ?? "").toString();
        const imagenVal = (obtenerValor(r, 'VACIO', 'imagen', 'IMAGEN') ?? "").toString();

        // Si no hay imagen en BD, construimos la ruta estándar del bucket con el ID
        const urlImagenFinal = imagenVal ? imagenVal : (idVal ? `${SUPABASE_STORAGE_URL}/${idVal}.webp` : '');

        return {
            id: idVal,
            nombre: (obtenerValor(r, 'NOMBRE', 'nombre') ?? "").toString(),
            tipo: (obtenerValor(r, 'TIPO', 'tipo') ?? "PULSERA").toString(),
            precio: Number(obtenerValor(r, 'PRECIO', 'precio') ?? 0),
            stock: Number(obtenerValor(r, 'STOCK', 'stock') ?? 0),
            estado: (obtenerValor(r, 'ESTADO', 'estado') ?? "ACTIVO").toString(),
            destacado: (obtenerValor(r, 'DESTACADO', 'destacado') ?? "NO").toString(),
            material: (obtenerValor(r, 'MATERIAL', 'material') ?? "").toString(),
            descripcion: (obtenerValor(r, 'DESCRIPCION ESPIRITUAL', 'descripcion') ?? "").toString(),
            imagen: urlImagenFinal,
            orden: Number(obtenerValor(r, 'ORDEN', 'orden') ?? 999)
        };
        });

        window.productosFiltrados = [...window.productosAdmin];
        actualizarKPIs();
        renderizarTabla();
        renderizarPaginador();
    } catch (e) {
        mostrarToast("Error al cargar página: " + e.message, "error");
    }
}

function renderizarPaginador() {
    const totalPaginas = Math.ceil(totalProductosBD / LIMITE_POR_PAGINA);
    let paginadorEl = document.getElementById("paginador-tabla");

    if (!paginadorEl) {
        paginadorEl = document.createElement("div");
        paginadorEl.id = "paginador-tabla";
        paginadorEl.className = "paginador-container";
        document.querySelector(".tabla-wrap").after(paginadorEl);
    }

    paginadorEl.innerHTML = `
        <button ${paginaActual === 1 ? 'disabled' : ''} onclick="recargarProductos(${paginaActual - 1})">❮ Anterior</button>
        <span>Página <strong>${paginaActual}</strong> de ${totalPaginas || 1}</span>
        <button ${paginaActual >= totalPaginas ? 'disabled' : ''} onclick="recargarProductos(${paginaActual + 1})">Siguiente ❯</button>
    `;
}

// Actualización de Métricas KPIs
function actualizarKPIs() {
    const total = window.productosAdmin.length;
    const bajoStock = window.productosAdmin.filter(p => p.stock <= 3).length;
    const destacados = window.productosAdmin.filter(p => (p.destacado || "").toUpperCase() === "SI").length;
    const valorInventario = window.productosAdmin.reduce((sum, p) => sum + (p.precio * p.stock), 0);

    if (document.getElementById("kpi-total-productos")) document.getElementById("kpi-total-productos").textContent = total;
    if (document.getElementById("kpi-bajo-stock")) document.getElementById("kpi-bajo-stock").textContent = bajoStock;
    if (document.getElementById("kpi-destacados")) document.getElementById("kpi-destacados").textContent = destacados;
    if (document.getElementById("kpi-valor-inventario")) document.getElementById("kpi-valor-inventario").textContent = `S/ ${valorInventario.toFixed(2)}`;
}

// Renderizado optimizado de la tabla
function renderizarTabla() {
    const tbody = document.getElementById("tabla-productos");
    if (!tbody) return;

    if (!window.productosFiltrados.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="tabla-vacia">No hay productos registrados.</td></tr>`;
        actualizarBarraLote();
        return;
    }

    const fragment = document.createDocumentFragment();

    window.productosFiltrados.forEach(p => {
        const activo = (p.estado || "").toLowerCase() === "activo";
        const defaultBucket = typeof SUPABASE_STORAGE_URL !== "undefined" ? `${SUPABASE_STORAGE_URL}/no-image.webp` : "";
        
        let fotoTabla = defaultBucket;
        if (p.imagen && p.imagen.startsWith("http")) {
            fotoTabla = p.imagen.split(",")[0].trim();
        } else if (p.id) {
            fotoTabla = `${SUPABASE_STORAGE_URL}/${p.id}.webp`;
        }

        const tr = document.createElement("tr");
        if (!activo) tr.className = "fila-inactiva";

        const estaSeleccionado = seleccionados.has(p.id);

        tr.innerHTML = `
            <td style="text-align: center;">
                <input type="checkbox" class="check-producto" data-id="${escapeHTML(p.id)}" ${estaSeleccionado ? "checked" : ""}>
            </td>
            <td>${escapeHTML(p.id)}</td>
            <td>
                <div class="producto-admin">
                    <img src="${escapeHTML(fotoTabla)}" loading="lazy">
                    <div>
                        <!-- Doble clic para editar Nombre -->
                        <strong class="editable-inline" data-campo="nombre" data-id="${escapeHTML(p.id)}" title="Doble clic para editar nombre">
                            ${escapeHTML(p.nombre)}
                        </strong>
                        <small>${escapeHTML(p.id)} ${p.destacado === "SI" ? "⭐" : ""}</small>
                    </div>
                </div>
            </td>
            <td>${escapeHTML(p.tipo)}</td>
            <td>
                <!-- Doble clic para editar Precio -->
                <span class="editable-inline" data-campo="precio" data-id="${escapeHTML(p.id)}" title="Doble clic para editar precio">
                    S/ ${Number(p.precio).toFixed(2)}
                </span>
            </td>
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
                <button type="button" data-accion="editar" data-id="${escapeHTML(p.id)}">✎</button>
                <button type="button" data-accion="eliminar" data-id="${escapeHTML(p.id)}" style="color:red;">🗑</button>
            </td>
        `;
        fragment.appendChild(tr);
    });

    tbody.innerHTML = "";
    tbody.appendChild(fragment);
    actualizarBarraLote();
}

// Ordenar Tabla
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

// Aplicar Filtros Combinados
function aplicarFiltros(resetearOrden = true) {
    const texto = (document.getElementById("buscar-producto")?.value || "").trim().toLowerCase();
    const tipo = document.getElementById("filtro-tipo")?.value || "";
    const estado = document.getElementById("filtro-estado")?.value || "";
    const stock = document.getElementById("filtro-stock")?.value || "";
    const destacado = document.getElementById("filtro-destacado-select")?.value || "";

    window.productosFiltrados = window.productosAdmin.filter(p => {
        const coincideTexto = p.nombre.toLowerCase().includes(texto) || p.id.toLowerCase().includes(texto);
        const coincideTipo = !tipo || p.tipo === tipo;
        const coincideEstado = !estado || p.estado === estado;
        const coincideDestacado = !destacado || p.destacado === destacado;
        
        let coincideStock = true;
        if (stock === "DISPONIBLE") coincideStock = p.stock > 0;
        if (stock === "AGOTADO") coincideStock = p.stock <= 0;

        return coincideTexto && coincideTipo && coincideEstado && coincideStock && coincideDestacado;
    });

    if (!resetearOrden && ordenActual.columna !== null) {
        const tempAsc = ordenActual.ascendente;
        ordenActual.ascendente = !tempAsc;
        ordenarDatos(ordenActual.columna, document.querySelector(`th[data-col="${ordenActual.columna}"]`)?.dataset.tipo);
    } else {
        renderizarTabla();
    }
}

function limpiarFiltros() {
    if (document.getElementById("buscar-producto")) document.getElementById("buscar-producto").value = "";
    if (document.getElementById("filtro-tipo")) document.getElementById("filtro-tipo").value = "";
    if (document.getElementById("filtro-estado")) document.getElementById("filtro-estado").value = "";
    if (document.getElementById("filtro-stock")) document.getElementById("filtro-stock").value = "";
    if (document.getElementById("filtro-destacado-select")) document.getElementById("filtro-destacado-select").value = "";
    
    aplicarFiltros(true);
}

// Selección Múltiple y Acciones en Lote
function actualizarBarraLote() {
    const barra = document.getElementById("barra-lote");
    const contador = document.getElementById("contador-seleccionados");
    const checkTodos = document.getElementById("check-seleccionar-todos");

    if (!barra) return;

    if (seleccionados.size > 0) {
        barra.hidden = false;
        if (contador) contador.textContent = seleccionados.size;
    } else {
        barra.hidden = true;
    }

    if (checkTodos) {
        const visibles = window.productosFiltrados.map(p => p.id);
        checkTodos.checked = visibles.length > 0 && visibles.every(id => seleccionados.has(id));
    }
}

async function cambiarEstadoMasivo(nuevoEstado) {
    if (!seleccionados.size || !window.dbSchema) return;
    const ids = Array.from(seleccionados);

    try {
        const payload = {};
        payload[window.dbSchema.estado] = nuevoEstado;

        const { error } = await supabaseClient.from('productos').update(payload).in(window.dbSchema.id, ids);
        if (error) throw error;

        notificarCambioCatalogo();
        mostrarToast(`Se actualizaron ${ids.length} productos a ${nuevoEstado}`, "exito");
        seleccionados.clear();
        await recargarProductos();
    } catch (err) {
        mostrarToast("Error en acción masiva: " + err.message, "error");
    }
}

async function eliminarMasivo() {
    if (!seleccionados.size || !window.dbSchema) return;
    const ids = Array.from(seleccionados);

    if (!confirm(`¿Estás seguro de eliminar los ${ids.length} productos seleccionados?`)) return;

    try {
        const { error } = await supabaseClient.from('productos').delete().in(window.dbSchema.id, ids);
        if (error) throw error;

        notificarCambioCatalogo();
        mostrarToast(`Se eliminaron ${ids.length} productos`, "exito");
        seleccionados.clear();
        await recargarProductos();
    } catch (err) {
        mostrarToast("Error al eliminar masivamente: " + err.message, "error");
    }
}

// Exportación CSV
function exportarCSV() {
    if (!window.productosAdmin.length) return mostrarToast("No hay datos para exportar", "error");

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Nombre,Tipo,Precio,Stock,Estado,Destacado,Material\n";

    window.productosAdmin.forEach(p => {
        const fila = [
            `"${p.id}"`,
            `"${p.nombre.replace(/"/g, '""')}"`,
            `"${p.tipo}"`,
            p.precio,
            p.stock,
            `"${p.estado}"`,
            `"${p.destacado}"`,
            `"${p.material.replace(/"/g, '""')}"`
        ].join(",");
        csvContent += fila + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventario_oriza_art_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Convertidor WEBP
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

// Guardar Formulario
async function guardarFormulario(e) {
    e.preventDefault();
    if (!window.dbSchema) return mostrarToast("Espera a que cargue la base de datos.", "error");

    const id = document.getElementById("f-id").value.trim().toUpperCase();
    if (!id) return mostrarToast("El ID es obligatorio.", "error");

    try {
        mostrarToast("Guardando producto e imágenes...", "info");

        const BUCKET_NAME = 'productos';
        const timestamp = Date.now();
        const nombreFinalDePosicion = (i) => (i === 0 ? `${id}.webp` : `${id}-${i + 1}.webp`);

        const temporales = [];
        for (let i = 0; i < imagenesSeleccionadas.length; i++) {
            const img = imagenesSeleccionadas[i];
            if (!img.blob) {
                let nombreOrigen = img.nombreTemp || "";
                if (nombreOrigen.startsWith('http')) {
                    const partes = nombreOrigen.split('/');
                    nombreOrigen = partes[partes.length - 1];
                }
                nombreOrigen = nombreOrigen.split('?')[0];

                const nombreTemp = `_tmp_${timestamp}_${i}.webp`;
                if (nombreOrigen && nombreOrigen !== nombreTemp) {
                    await supabaseClient.storage.from(BUCKET_NAME).move(nombreOrigen, nombreTemp);
                }
                temporales[i] = nombreTemp;
            }
        }

        let listaUrls = [];
        const nombresFinales = [];

        for (let i = 0; i < imagenesSeleccionadas.length; i++) {
            const img = imagenesSeleccionadas[i];
            const nombreDestino = nombreFinalDePosicion(i);
            nombresFinales.push(nombreDestino);

            if (img.blob) {
                const { error: upErr } = await supabaseClient.storage
                    .from(BUCKET_NAME)
                    .upload(nombreDestino, img.blob, { contentType: 'image/webp', upsert: true });
                if (upErr) throw upErr;
            } else {
                await supabaseClient.storage.from(BUCKET_NAME).move(temporales[i], nombreDestino);
            }

            const { data: urlData } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(nombreDestino);
            listaUrls.push(`${urlData.publicUrl}?v=${timestamp}_${i}`);
        }

        const urlImagenFinal = listaUrls.join(",");

        const payload = {};
        payload[window.dbSchema.id] = id;
        payload[window.dbSchema.tipo] = document.getElementById("f-tipo").value;
        payload[window.dbSchema.nombre] = document.getElementById("f-nombre").value.trim();
        payload[window.dbSchema.precio] = Number(document.getElementById("f-precio").value || 0);
        payload[window.dbSchema.material] = document.getElementById("f-material").value.trim();
        payload[window.dbSchema.descripcion] = document.getElementById("f-descripcion").value.trim();
        payload[window.dbSchema.imagen] = urlImagenFinal;
        payload[window.dbSchema.estado] = document.getElementById("f-estado").value;
        payload[window.dbSchema.destacado] = document.getElementById("f-destacado").value;
        payload[window.dbSchema.orden] = Number(document.getElementById("f-orden").value || 999);
        payload[window.dbSchema.stock] = Number(document.getElementById("f-stock").value || 0);

        let error;
        if (editandoId) {
            const res = await supabaseClient.from('productos').update(payload).eq(window.dbSchema.id, editandoId);
            error = res.error;
        } else {
            const { data: maxResult } = await supabaseClient
                .from('productos')
                .select('N°')
                .order('N°', { ascending: false })
                .limit(1);

            let maxN = (maxResult && maxResult.length > 0) ? Number(maxResult[0]['N°'] || 0) : window.productosAdmin.length;
            payload["N°"] = maxN + 1;

            const res = await supabaseClient.from('productos').insert([payload]);
            error = res.error;
        }
        await registrarAuditoria(editandoId ? "EDITAR_PRODUCTO" : "CREAR_PRODUCTO", id, `Nombre: ${payload[window.dbSchema.nombre]}`);
        if (error) throw error;

        notificarCambioCatalogo();
        mostrarToast(editandoId ? "Producto actualizado correctamente" : "Producto creado correctamente", "exito");
        
        cerrarFormulario();
        await recargarProductos();
    } catch (err) {
        mostrarToast("Error: " + err.message, "error");
    }
}

async function eliminarProducto(id) {
    if (!confirm(`¿Estás seguro de eliminar el producto ${id}?`)) return;
    try {
        const { error } = await supabaseClient.from('productos').delete().eq(window.dbSchema.id, id);
        if (error) throw error;
        
        notificarCambioCatalogo();
        await registrarAuditoria("ELIMINAR_PRODUCTO", id, "Producto eliminado manualmente");
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
        mostrarToast("Stock actualizado", "exito");
        const p = window.productosAdmin.find(x => x.id === id);
        if (p) p.stock = Number(nuevoStock);
        actualizarKPIs();
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

async function iniciarSesion(email, password) {
    try {
        // Usar la API nativa de Auth de Supabase
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email.trim(),
            password: password.trim()
        });
            
        if (error) {
            mostrarErrorLogin("Credenciales inválidas: " + error.message);
            return false;
        }

        mostrarPanel();
        await recargarProductos();
        return true;
    } catch (err) { 
        mostrarErrorLogin("Error al conectar con el servidor.");
        return false; 
    }
}

// Cierre de sesión nativo
async function cerrarSesion() {
    await supabaseClient.auth.signOut();
    location.reload();
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

    imagenesSeleccionadas = [];

    const cadenaImagenes = producto?.imagen || '';

    if (cadenaImagenes.trim() !== '') {
        const imagenesExistentes = cadenaImagenes.split(',').map(img => img.trim());
        imagenesExistentes.forEach(nombreImg => {
            const urlCompleta = nombreImg.startsWith('http') 
                ? nombreImg 
                : `${SUPABASE_STORAGE_URL}/${nombreImg}`;

            imagenesSeleccionadas.push({
                blob: null,
                urlPreview: urlCompleta,
                nombreTemp: nombreImg
            });
        });
    }

    renderizarPrevisualizacion();

    const inputImagenes = document.getElementById("inputImagenes");
    if (inputImagenes) inputImagenes.value = "";

    actualizarPreview();
    overlay.hidden = false;
}

function cerrarFormulario() {
    const overlay = document.getElementById("form-overlay");
    if (overlay) overlay.hidden = true;
    editandoId = null;
}

function actualizarPreview() {
    const nombre = document.getElementById("f-nombre")?.value || "Nombre del producto";
    const precio = Number(document.getElementById("f-precio")?.value || 0).toFixed(2);
    const tipo = document.getElementById("f-tipo")?.value || "PULSERA";
    const material = document.getElementById("f-material")?.value || "Perlas, Hilo de nylon";
    const descripcion = document.getElementById("f-descripcion")?.value || "Descripción detallada...";
    const stock = Number(document.getElementById("f-stock")?.value || 0);
    const destacado = document.getElementById("f-destacado")?.value;

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
        if (imagenesSeleccionadas.length > 0) {
            prevImg.src = imagenesSeleccionadas[0].urlPreview;
        } else {
            prevImg.src = `${SUPABASE_STORAGE_URL}/no-image.webp`;
        }
    }
}

// Gestión de Miniaturas e Imágenes
async function manejarSeleccionImagenes(event) {
    const archivos = Array.from(event.target.files);
    if (!archivos.length) return;

    for (const archivo of archivos) {
        const blobWebp = await convertirImagenAWebp(archivo);
        const urlBlob = URL.createObjectURL(blobWebp);
        
        imagenesSeleccionadas.push({
            blob: blobWebp,
            urlPreview: urlBlob,
            nombreTemp: null
        });
    }

    renderizarPrevisualizacion();
    actualizarPreview();
}

function renderizarPrevisualizacion() {
    const contenedor = document.getElementById('contenedor-preview-imagenes');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    imagenesSeleccionadas.forEach((img, index) => {
        const esPrincipal = index === 0;
        const item = document.createElement('div');
        item.className = `img-preview-card ${esPrincipal ? 'es-principal' : ''}`;

        item.innerHTML = `
            <div class="img-preview-thumb">
                <img src="${img.urlPreview}" alt="Preview ${index + 1}">
                <span class="img-preview-badge">${esPrincipal ? '⭐ Principal' : `#${index + 1}`}</span>
                <div class="img-preview-overlay">
                    ${!esPrincipal ? `<button type="button" class="img-preview-btn" onclick="moverAPrincipal(${index})">⭐</button>` : ''}
                    <button type="button" class="img-preview-btn img-preview-btn-danger" onclick="eliminarImagen(${index})">🗑️</button>
                </div>
            </div>
        `;
        contenedor.appendChild(item);
    });
}

function moverAPrincipal(index) {
    const elemento = imagenesSeleccionadas.splice(index, 1)[0];
    imagenesSeleccionadas.unshift(elemento);
    renderizarPrevisualizacion(); 
    actualizarPreview();
}

function eliminarImagen(index) {
    imagenesSeleccionadas.splice(index, 1);
    renderizarPrevisualizacion();
    actualizarPreview();
}

function mostrarToast(mensaje, tipo = "info") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.className = `mostrar ${tipo}`;
    toast.textContent = mensaje;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { toast.className = ""; }, 3000);
}

async function registrarAuditoria(accion, productoId, detalles = "") {
    try {
        // Obtener la sesión activa
        const { data: { session } } = await supabaseClient.auth.getSession();
        const user = session?.user;

        const logEntry = {
            usuario_id: user?.id || null,
            usuario_email: user?.email || "usuario_anonimo",
            accion: accion,
            producto_id: String(productoId),
            detalles: detalles
        };

        const { error } = await supabaseClient
            .from('audit_logs')
            .insert([logEntry]);

        if (error) {
            console.error("Error al insertar en audit_logs:", error.message);
        }
    } catch (err) {
        console.warn("Excepción en auditoría:", err.message);
    }
}

// 1. Función unificada para guardar cualquier cambio en Supabase
async function guardarCambioInline(idProducto, columnaClave, nuevoValor, callbackExito) {
    if (typeof supabaseClient === "undefined") return;

    const columnaBD = window.dbSchema?.[columnaClave] || columnaClave.toUpperCase();
    const columnaIdBD = window.dbSchema?.id || 'ID';

    try {
        const { error } = await supabaseClient
            .from('productos')
            .update({ [columnaBD]: nuevoValor })
            .eq(columnaIdBD, idProducto);

        if (error) throw error;

        // Registrar auditoría del cambio inline
        await registrarAuditoria(
            "UPDATE_INLINE", 
            idProducto, 
            `Campo '${columnaBD}' actualizado a '${nuevoValor}'`
        );

        mostrarToast("Guardado correctamente", "exito");

        const prod = window.productosAdmin.find(p => p.id.toString() === idProducto.toString());
        if (prod) prod[columnaClave] = nuevoValor;

        actualizarKPIs();
        if (typeof callbackExito === 'function') callbackExito();

    } catch (err) {
        mostrarToast("Error al guardar: " + err.message, "error");
        recargarProductos(paginaActual);
    }
}

// 2. Listener global para CAMBIO DE STOCK (Input)
document.addEventListener('change', async (e) => {
    if (e.target.classList.contains('input-stock')) {
        const id = e.target.getAttribute('data-id');
        const nuevoStock = Number(e.target.value);
        await guardarCambioInline(id, 'stock', nuevoStock);
    }
});

// 3. Listener global para CAMBIO DE ESTADO (Botón Activo / Inactivo)
document.addEventListener('click', async (e) => {
    const btnEstado = e.target.closest('[data-accion="toggle-estado"]');
    if (btnEstado) {
        const id = btnEstado.getAttribute('data-id');
        const esActivoActual = btnEstado.classList.contains('activo');
        const nuevoEstado = esActivoActual ? 'INACTIVO' : 'ACTIVO';

        await guardarCambioInline(id, 'estado', nuevoEstado, () => {
            renderizarTabla(); // Re-renderiza para actualizar los colores del badge
        });
    }
});

// 4. Listener global para DOBLE CLIC (Nombre y Precio editable)
document.addEventListener('dblclick', (e) => {
    const elemento = e.target.closest('.editable-inline');
    if (!elemento || elemento.querySelector('input')) return; // Evitar abrir si ya hay un input

    const id = elemento.getAttribute('data-id');
    const campo = elemento.getAttribute('data-campo'); // 'nombre' o 'precio'
    const valorActual = campo === 'precio' 
        ? elemento.textContent.replace('S/', '').trim() 
        : elemento.textContent.trim();

    // Reemplazar texto por un input temporal
    const input = document.createElement('input');
    input.type = campo === 'precio' ? 'number' : 'text';
    input.value = valorActual;
    input.style.cssText = "width: 100%; padding: 4px; font-size: inherit;";

    elemento.innerHTML = '';
    elemento.appendChild(input);
    input.focus();

    // Guardar al presionar ENTER o al perder el foco (BLUR)
    const guardar = async () => {
        let nuevoValor = input.value.trim();
        if (campo === 'precio') nuevoValor = Number(nuevoValor);

        if (nuevoValor !== "" && nuevoValor !== valorActual) {
            await guardarCambioInline(id, campo, nuevoValor, () => {
                renderizarTabla();
            });
        } else {
            renderizarTabla(); // Si no cambió nada, re-renderizar para quitar el input
        }
    };

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') guardar();
        if (e.key === 'Escape') renderizarTabla();
    });

    input.addEventListener('blur', guardar, { once: true });
});

// Event Listeners principales
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
    document.getElementById("btn-exportar")?.addEventListener("click", exportarCSV);
    document.getElementById("btn-limpiar-filtros")?.addEventListener("click", limpiarFiltros);

    // listeners de Lote
    document.getElementById("btn-lote-activar")?.addEventListener("click", () => cambiarEstadoMasivo("ACTIVO"));
    document.getElementById("btn-lote-desactivar")?.addEventListener("click", () => cambiarEstadoMasivo("INACTIVO"));
    document.getElementById("btn-lote-eliminar")?.addEventListener("click", eliminarMasivo);

    // Selección de la tabla
    document.getElementById("check-seleccionar-todos")?.addEventListener("change", (e) => {
        const checked = e.target.checked;
        window.productosFiltrados.forEach(p => {
            if (checked) seleccionados.add(p.id);
            else seleccionados.delete(p.id);
        });
        renderizarTabla();
    });

    document.getElementById("tabla-productos")?.addEventListener("change", (e) => {
        if (e.target.classList.contains("check-producto")) {
            const id = e.target.dataset.id;
            if (e.target.checked) seleccionados.add(id);
            else seleccionados.delete(id);
            actualizarBarraLote();
        }
        if (e.target.classList.contains("input-stock")) {
            actualizarStockRapido(e.target.dataset.id, e.target.value);
        }
    });

    document.getElementById("tabla-productos")?.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-accion]");
        if (!btn) return;
        const id = btn.dataset.id;
        const accion = btn.dataset.accion;

        if (accion === "editar") abrirFormulario(window.productosAdmin.find(p => p.id === id));
        else if (accion === "eliminar") eliminarProducto(id);
        else if (accion === "toggle-estado") toggleEstado(id);
    });

    document.querySelectorAll("th[data-col]").forEach(th => {
        th.style.cursor = "pointer";
        th.addEventListener("click", () => ordenarDatos(parseInt(th.dataset.col), th.dataset.tipo));
    });

    document.getElementById("buscar-producto")?.addEventListener("input", () => aplicarFiltros(true));
    document.getElementById("filtro-tipo")?.addEventListener("change", () => aplicarFiltros(true));
    document.getElementById("filtro-estado")?.addEventListener("change", () => aplicarFiltros(true));
    document.getElementById("filtro-stock")?.addEventListener("change", () => aplicarFiltros(true));
    document.getElementById("filtro-destacado-select")?.addEventListener("change", () => aplicarFiltros(true));

    document.querySelectorAll("#form-producto input, #form-producto select, #form-producto textarea").forEach(el => {
        el.addEventListener("input", actualizarPreview);
        el.addEventListener("change", actualizarPreview);
    });
}); 