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
// Guardar formulario combinando imágenes previas + nuevas
async function guardarFormulario(e) {
    e.preventDefault();
    if (!window.dbSchema) return mostrarToast("Espera a que cargue la base de datos.", "error");

    const id = document.getElementById("f-id").value.trim().toUpperCase();
    if (!id) return mostrarToast("El ID es obligatorio.", "error");

    const inputPrincipal = document.getElementById("f-imagen-principal");
    const inputArchivo = document.getElementById("f-imagen-file");
    
    // Obtenemos las URLs actuales en el input o estado previo
    let urlImagenActual = document.getElementById("f-imagen").value.trim();
    let listaUrls = urlImagenActual ? urlImagenActual.split(",").map(u => u.trim()).filter(Boolean) : [];

    try {
        mostrarToast("Guardando producto e imágenes, por favor espera...", "info");

        const BUCKET_NAME = 'productos';
        const timestamp = Date.now();

        // Nombre final que le corresponde a cada imagen según su posición en pantalla:
        // posición 0 = "ID.webp" (principal), posición 1 = "ID-2.webp", etc.
        const nombreFinalDePosicion = (i) => (i === 0 ? `${id}.webp` : `${id}-${i + 1}.webp`);

        // FASE 1: mover TODAS las imágenes que ya existían en el Storage a nombres
        // temporales. Esto evita colisiones cuando se reordena (ej. si la #2 pasa a
        // ser la principal, no podemos moverla directo a "ID.webp" porque ese nombre
        // todavía lo tiene otra imagen que aún no se ha movido).
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
                    const { error: moveErr } = await supabaseClient.storage.from(BUCKET_NAME).move(nombreOrigen, nombreTemp);
                    if (moveErr) console.warn("Aviso moviendo a temporal:", nombreOrigen, moveErr.message);
                }
                temporales[i] = nombreTemp;
            }
        }

        // FASE 2: subir las imágenes nuevas y renombrar las existentes a su nombre
        // definitivo según la posición final que armaste en el formulario.
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
                const { error: moveErr } = await supabaseClient.storage.from(BUCKET_NAME).move(temporales[i], nombreDestino);
                if (moveErr) console.warn("Aviso moviendo a destino final:", temporales[i], moveErr.message);
            }

            const { data: urlData } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(nombreDestino);
            listaUrls.push(`${urlData.publicUrl}?v=${timestamp}_${i}`);
        }

        // Limpieza: si antes había más imágenes que ahora (ej. tenías 6 y dejaste 3),
        // borramos del Storage los archivos "ID-4.webp", "ID-5.webp"... que ya no se usan.
        try {
            const { data: archivosBucket } = await supabaseClient.storage.from(BUCKET_NAME).list('', { limit: 100 });
            const huerfanos = (archivosBucket || [])
                .map(a => a.name)
                .filter(nombre => {
                    const sinExt = nombre.split('.')[0].toUpperCase();
                    const perteneceAlProducto = sinExt === id || sinExt.startsWith(`${id}-`);
                    return perteneceAlProducto && !nombresFinales.includes(nombre);
                });
            if (huerfanos.length > 0) {
                await supabaseClient.storage.from(BUCKET_NAME).remove(huerfanos);
            }
        } catch (limpiezaErr) {
            console.warn("No se pudo limpiar imágenes huérfanas:", limpiezaErr.message);
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

// Sube la imagen principal y/o secundarias respetando las existentes
async function subirImagenesSupabase(idProducto, { principal = null, otras = [] } = {}, offsetSecundarias = 2) {
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

        return `${urlData.publicUrl}?v=${Date.now()}`;
    };

    const totalLog = (principal ? 1 : 0) + otras.length;
    let indiceLog = 1;

    // 1. Imagen principal: solo si se subió un nuevo archivo principal
    if (principal) {
        urlsGuardadas.push(await subirUnaImagen(principal, `${idProducto}.webp`, indiceLog, totalLog));
        indiceLog++;
    }

    // 2. Imágenes secundarias: continúan desde el offset adecuado (ej. -2, -3, -4...)
    for (let i = 0; i < otras.length; i++) {
        const numSecundaria = offsetSecundarias + i;
        const filePath = `${idProducto}-${numSecundaria}.webp`;
        urlsGuardadas.push(await subirUnaImagen(otras[i], filePath, indiceLog, totalLog));
        indiceLog++;
    }

    return urlsGuardadas;
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

    // 1. Rellenar campos de texto básicos
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

    // 2. Limpiar SIEMPRE el array global de imágenes (asegúrate de que esté descomentado)
    imagenesSeleccionadas = [];

    // 3. Leer la cadena de imágenes con '?' para evitar el error cuando 'producto' es null
    const cadenaImagenes = producto?.VACIO || producto?.imagen || '';

    if (cadenaImagenes.trim() !== '') {
        // Separamos por comas si hay varias
        const imagenesExistentes = cadenaImagenes.split(',').map(img => img.trim());
        
        // Base de tu storage de Supabase (ajustado según tu HTML)
        const storageBaseUrl = 'https://ltzfnsrxkkyuupwyykem.supabase.co/storage/v1/object/public/productos';

        imagenesExistentes.forEach(nombreImg => {
            // Si la URL ya empieza con http, la usamos. Si no, le añadimos la ruta base del storage.
            const urlCompleta = nombreImg.startsWith('http') 
                ? nombreImg 
                : `${storageBaseUrl}/${nombreImg}`;

            imagenesSeleccionadas.push({
                blob: null, // No hay archivo físico nuevo, ya está en el servidor
                urlPreview: urlCompleta,
                nombreTemp: nombreImg
            });
        });
    }

    // 4. Dibujar la galería en el contenedor `#contenedor-preview-imagenes`
    renderizarPrevisualizacion();

    // 5. Limpiar el nuevo input de archivos múltiples
    const inputImagenes = document.getElementById("inputImagenes");
    if (inputImagenes) inputImagenes.value = "";

    actualizarPreview();
    overlay.hidden = false;

    // 6. Además de lo que traiga la base de datos, revisamos si en el Storage
    // ya existen archivos con este ID (ej. subidos manualmente o de una sesión anterior)
    // y los agregamos a la galería si no están ya incluidos.
    sincronizarImagenesConBucket();
}

// Busca en el bucket 'productos' archivos que empiecen con el ID indicado
// (ID.webp, ID-2.webp, ID-3.webp...) y los agrega a la galería de edición
// si todavía no están en imagenesSeleccionadas. No borra ni reemplaza nada existente.
async function sincronizarImagenesConBucket() {
    const id = document.getElementById("f-id")?.value.trim().toUpperCase();
    if (!id || typeof supabaseClient === "undefined") return;

    try {
        const BUCKET_NAME = 'productos';
        const { data: archivos, error } = await supabaseClient.storage.from(BUCKET_NAME).list('', { limit: 100, search: id });
        if (error) throw error;

        const coincidencias = (archivos || []).filter(a => {
            const sinExt = a.name.split('.')[0].toUpperCase();
            return sinExt === id || sinExt.startsWith(`${id}-`);
        });

        if (coincidencias.length === 0) return;

        coincidencias.sort((a, b) => {
            const aName = a.name.toUpperCase();
            const bName = b.name.toUpperCase();
            if (aName === `${id}.WEBP`) return -1;
            if (bName === `${id}.WEBP`) return 1;
            return aName.localeCompare(bName, undefined, { numeric: true });
        });

        let agregadas = 0;
        coincidencias.forEach(archivo => {
            const yaExiste = imagenesSeleccionadas.some(img => img.nombreTemp === archivo.name);
            if (!yaExiste) {
                const { data: urlData } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(archivo.name);
                imagenesSeleccionadas.push({
                    blob: null,
                    urlPreview: `${urlData.publicUrl}?v=${Date.now()}`,
                    nombreTemp: archivo.name
                });
                agregadas++;
            }
        });

        if (agregadas > 0) {
            renderizarPrevisualizacion();
            actualizarPreview();
            mostrarToast(`Se encontraron ${agregadas} imagen(es) ya guardadas para "${id}"`, "info");
        }
    } catch (err) {
        console.warn("No se pudo sincronizar con el bucket:", err.message);
    }
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
    // 1. Si hay imágenes en nuestro nuevo sistema, mostramos la Principal (índice 0)
    if (typeof imagenesSeleccionadas !== 'undefined' && imagenesSeleccionadas.length > 0) {
        prevImg.src = imagenesSeleccionadas[0].urlPreview;
    } 
    // 2. Si no, intentamos mostrar la foto por defecto del ID
    else if (id && id.trim() !== "") {
        prevImg.src = `${SUPABASE_STORAGE_URL}/${id.trim().toUpperCase()}.webp`;
    } 
    // 3. Fallback en caso de que no haya nada
    else {
        prevImg.src = "https://ltzfnsrxkkyuupwyykem.supabase.co/storage/v1/object/public/productos/no-image.webp";
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

// Obtiene la lista de archivos que corresponden al ID del producto desde el Storage de Supabase
// Variable temporal para mantener el orden actual de las URLs en edición
let urlsGaleriaActuales = [];

// Variable global para gestionar la secuencia de fotos en edición
window.urlsGaleriaActuales = [];

// 1. Cargar imágenes existentes desde Supabase Storage y el input f-imagen
window.cargarGaleriaBucket = async function(idProducto) {
    const contenedor = document.getElementById("galeria-bucket-container");
    const inputImagen = document.getElementById("f-imagen");
    if (!contenedor) return;

    if (!idProducto) {
        contenedor.innerHTML = `<small style="color:#888;">Guarda el producto antes de gestionar imágenes en el bucket.</small>`;
        return;
    }

    contenedor.innerHTML = `<small style="color:#888;">Cargando imágenes...</small>`;

    try {
        const BUCKET_NAME = 'productos';
        const idLimpio = idProducto.trim().toUpperCase();

        // Obtener URLs previamente guardadas en la base de datos (campo f-imagen)
        let urlsTexto = inputImagen ? inputImagen.value.trim() : "";
        window.urlsGaleriaActuales = urlsTexto ? urlsTexto.split(",").map(u => u.trim()).filter(Boolean) : [];

        // Consultar el Bucket para obtener los archivos reales
        const { data: archivos, error } = await supabaseClient
            .storage
            .from(BUCKET_NAME)
            .list('', { limit: 100 });

        if (error) throw error;

        // Filtrar archivos que pertenecen a este ID (ej: ID.webp, ID-2.webp, id.webp, id-3.webp)
        const archivosProducto = (archivos || []).filter(archivo => {
            const nombreSinExt = archivo.name.split('.')[0].toUpperCase();
            return nombreSinExt === idLimpio || nombreSinExt.startsWith(`${idLimpio}-`);
        });

        // Crear mapa con las URLs públicas con token anti-caché
        let mapaUrlsDisponibles = {};
        archivosProducto.forEach(archivo => {
            const { data: urlData } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(archivo.name);
            mapaUrlsDisponibles[archivo.name] = `${urlData.publicUrl}?v=${Date.now()}`;
        });

        // Si la lista de URLs está vacía, la llenamos con las encontradas en el bucket
        if (window.urlsGaleriaActuales.length === 0) {
            archivosProducto.sort((a, b) => {
                const aName = a.name.toUpperCase();
                const bName = b.name.toUpperCase();
                if (aName === `${idLimpio}.WEBP`) return -1;
                if (bName === `${idLimpio}.WEBP`) return 1;
                return aName.localeCompare(bName, undefined, { numeric: true });
            });

            window.urlsGaleriaActuales = archivosProducto.map(a => mapaUrlsDisponibles[a.name]);
            if (inputImagen) inputImagen.value = window.urlsGaleriaActuales.join(",");
        }

        if (window.urlsGaleriaActuales.length === 0) {
            contenedor.innerHTML = `<small style="color:#888;">No hay imágenes registradas para este producto.</small>`;
            return;
        }

        renderizarGridGaleria(idLimpio, mapaUrlsDisponibles);

    } catch (err) {
        console.error("Error al cargar galería:", err);
        contenedor.innerHTML = `<small style="color:red;">Error al cargar imágenes (${err.message}).</small>`;
    }
};

// 2. Dibujar las miniaturas con sus distintivos #1 (Principal) y #2, #3... (Secundarias)
function renderizarGridGaleria(idProducto, mapaUrlsDisponibles) {
    const contenedor = document.getElementById("galeria-bucket-container");
    if (!contenedor) return;

    if (window.urlsGaleriaActuales.length === 0) {
        contenedor.innerHTML = `<small style="color:#888;">Sin imágenes disponibles.</small>`;
        return;
    }

    contenedor.innerHTML = window.urlsGaleriaActuales.map((url, index) => {
        const nombreArchivoMatch = Object.keys(mapaUrlsDisponibles).find(key => url.includes(key));
        const nombreArchivo = nombreArchivoMatch || `imagen_${index}.webp`;
        const esPrincipal = index === 0;

        return `
            <div class="item-galeria-bucket ${esPrincipal ? 'es-principal' : ''}" style="position:relative; display:inline-block; margin:5px; text-align:center;">
                <img src="${url}" alt="Foto ${index + 1}" style="width: 75px; height: 75px; object-fit: cover; border-radius: 6px; border: ${esPrincipal ? '2px solid #6F4E37' : '1px solid #ccc'};">
                <div style="font-size: 10px; font-weight: bold; background: ${esPrincipal ? '#6F4E37' : '#555'}; color: #fff; padding: 2px 0; border-radius: 0 0 6px 6px;">
                    #${index + 1} ${esPrincipal ? 'Principal' : 'Secundaria'}
                </div>
                <div style="position: absolute; top: 2px; right: 2px; display: flex; gap: 2px;">
                    ${!esPrincipal ? `<button type="button" onclick="window.moverFotoGaleria(${index})" title="Convertir en Principal" style="background:#fff; border:none; cursor:pointer; border-radius:50%; width:20px; height:20px; font-size:10px;">⬆️</button>` : ''}
                    <button type="button" onclick="window.eliminarFotoBucket('${idProducto}', '${nombreArchivo}')" title="Eliminar" style="background:#fff; color:red; border:none; cursor:pointer; border-radius:50%; width:20px; height:20px; font-size:10px; font-weight:bold;">✕</button>
                </div>
            </div>
        `;
    }).join("");
}

// 3. Reordenar: Convierte cualquier imagen seleccionada en la N° 1 (Principal)
window.moverFotoGaleria = function(index) {
    if (index <= 0) return;

    // Quitar del índice actual y colocar al inicio (índice 0 = Principal)
    const fotoSeleccionada = window.urlsGaleriaActuales.splice(index, 1)[0];
    window.urlsGaleriaActuales.unshift(fotoSeleccionada);

    // Actualizar el valor en el input f-imagen que irá a la Base de Datos
    const inputImagen = document.getElementById("f-imagen");
    if (inputImagen) {
        inputImagen.value = window.urlsGaleriaActuales.join(",");
    }

    // Volver a renderizar las miniaturas
    const idProducto = document.getElementById("f-id").value.trim().toUpperCase();
    let mapaTemp = {};
    window.urlsGaleriaActuales.forEach(u => {
        const partes = u.split('/');
        const archivo = partes[partes.length - 1].split('?')[0];
        mapaTemp[archivo] = u;
    });

    renderizarGridGaleria(idProducto, mapaTemp);
    if (typeof actualizarPreview === "function") actualizarPreview();
    if (typeof mostrarToast === "function") mostrarToast("Imagen establecida como Principal (#1)", "info");
};

// 4. Eliminar foto del storage y reordenar lista
window.eliminarFotoBucket = async function(idProducto, nombreArchivo) {
    if (!confirm(`¿Estás seguro de eliminar la imagen "${nombreArchivo}"?`)) return;

    try {
        const BUCKET_NAME = 'productos';

        // Borrar en Supabase Storage
        await supabaseClient.storage.from(BUCKET_NAME).remove([nombreArchivo]);

        // Remover de la lista actual en memoria
        window.urlsGaleriaActuales = window.urlsGaleriaActuales.filter(u => !u.includes(nombreArchivo));

        const inputImagen = document.getElementById("f-imagen");
        if (inputImagen) {
            inputImagen.value = window.urlsGaleriaActuales.join(",");
        }

        if (typeof mostrarToast === "function") mostrarToast("Imagen eliminada", "exito");
        
        await window.cargarGaleriaBucket(idProducto);
        if (typeof actualizarPreview === "function") actualizarPreview();

    } catch (err) {
        if (typeof mostrarToast === "function") mostrarToast("Error al eliminar: " + err.message, "error");
    }
};

// En js/admin.js: Procesar y subir selección múltiple
async function subirImagenesTemporales(productoId, archivos) {
  const urlsSubidas = [];

  for (let i = 0; i < archivos.length; i++) {
    // Tu función existente de conversión a WebP
    const blobWebp = await convertirImagenAWebp(archivos[i]);
    
    // Nombre temporal único
    const nombreTemp = `${productoId}_temp_${Date.now()}_${i}.webp`;

    // Subida a Supabase Storage
    const { data, error } = await window.supabaseClient.storage
      .from('productos') // Nombre de tu bucket
      .upload(nombreTemp, blobWebp, { contentType: 'image/webp', upsert: true });

    if (!error) {
      urlsSubidas.push(nombreTemp);
    }
  }

  return urlsSubidas; // Retorna la lista de nombres subidos al bucket
}

// Renderizar miniaturas para reordenar en admin.js
function renderizarPrevisualizacionImagenes(listaNombresImagenes) {
  const contenedor = document.getElementById('contenedor-preview-imagenes');
  contenedor.innerHTML = '';

  listaNombresImagenes.forEach((nombreImg, index) => {
    const card = document.createElement('div');
    card.className = 'preview-card';
    card.dataset.index = index;
    
    // Identificador visual de cuál es la principal
    const esPrincipal = index === 0;

    card.innerHTML = `
      <img src="${SUPABASE_STORAGE_URL}/${nombreImg}" alt="Preview" />
      <span class="badge">${esPrincipal ? '⭐ Principal' : `#${index + 1}`}</span>
      <div class="acciones-preview">
        ${!esPrincipal ? `<button type="button" onclick="marcarComoPrincipal(${index})">Hacer Principal</button>` : ''}
        <button type="button" onclick="eliminarDePreview(${index})">🗑️</button>
      </div>
    `;

    contenedor.appendChild(card);
  });
}

// Renombrar en el Storage y guardar el orden final
async function aplicarOrdenYRenombrarBucket(productoId, listaNombresOrdenados) {
  const nombresDefinitivos = [];

  for (let index = 0; index < listaNombresOrdenados.length; index++) {
    const nombreOrigen = listaNombresOrdenados[index];
    
    // Construir el nombre estandarizado según la posición:
    // Posición 0 -> "ID.webp", Posición 1 -> "ID-2.webp", etc.
    const nombreDestino = index === 0 
      ? `${productoId}.webp` 
      : `${productoId}-${index + 1}.webp`;

    // Renombrar/Mover archivo dentro del bucket en Supabase
    const { error: moveError } = await window.supabaseClient.storage
      .from('productos')
      .move(nombreOrigen, nombreDestino);

    // Guardar el nombre final (agregando cache-buster para forzar refresco)
    nombresDefinitivos.push(`${nombreDestino}?v=${Date.now()}`);
  }

  // Actualizar el campo en la tabla de la Base de Datos
  const cadenaFinal = nombresDefinitivos.join(',');
  
  const { error: dbError } = await window.supabaseClient
    .from('productos')
    .update({ VACIO: cadenaFinal }) // Tu columna actual de imágenes
    .eq('codigo', productoId);

  if (!dbError) {
    alert('¡Imágenes organizadas y guardadas con éxito!');
  }
}

// Variable global dentro de admin.js para guardar el orden en memoria
let imagenesSeleccionadas = [];

// 1. OBTENER Y PREVISUALIZAR IMÁGENES AL SELECCIONAR
async function manejarSeleccionImagenes(event) {
  const archivos = Array.from(event.target.files);
  if (!archivos.length) return;

  // Convertimos a WebP y creamos URLs temporales para la vista previa
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

// 2. RENDERIZAR VISTA PREVIA Y BOTONES DE ORDEN
function renderizarPrevisualizacion() {
  const contenedor = document.getElementById('contenedor-preview-imagenes');
  if (!contenedor) return;
  contenedor.innerHTML = '';
  contenedor.classList.add('galeria-preview-grid');

  imagenesSeleccionadas.forEach((img, index) => {
    const esPrincipal = index === 0;
    const item = document.createElement('div');
    item.className = `img-preview-card ${esPrincipal ? 'es-principal' : ''}`;

    item.innerHTML = `
      <div class="img-preview-thumb">
        <img src="${img.urlPreview}" alt="Vista previa ${index + 1}">
        <span class="img-preview-badge">${esPrincipal ? '⭐ Principal' : `#${index + 1}`}</span>
        <div class="img-preview-overlay">
          ${!esPrincipal ? `<button type="button" class="img-preview-btn" onclick="moverAPrincipal(${index})" title="Hacer principal">⭐</button>` : ''}
          <button type="button" class="img-preview-btn img-preview-btn-danger" onclick="eliminarImagen(${index})" title="Eliminar">🗑️</button>
        </div>
      </div>
    `;
    contenedor.appendChild(item);
  });
}

// 3. CAMBIAR LA IMAGEN PRINCIPAL DE LUGAR
function moverAPrincipal(index) {
  const elemento = imagenesSeleccionadas.splice(index, 1)[0];
  imagenesSeleccionadas.unshift(elemento); // La mueve al inicio (Posición 0)
  renderizarPrevisualizacion(); 
  actualizarPreview();
}

function eliminarImagen(index) {
  imagenesSeleccionadas.splice(index, 1);
  renderizarPrevisualizacion();
  actualizarPreview();
}

// 4. GUARDAR Y RENOMBRAR EN SUPABASE BUCKET Y DB
// Reemplaza o llama a esta función dentro del evento 'submit' de tu formulario
async function guardarImagenesProducto(productoId) {
  if (!imagenesSeleccionadas.length) return;

  const nombresDefinitivos = [];

  for (let i = 0; i < imagenesSeleccionadas.length; i++) {
    const imgObj = imagenesSeleccionadas[i];
    
    // Asignamos el nombre correcto según la posición
    // Posición 0 = ID.webp (Principal) | Posición 1 = ID-2.webp | Posición 2 = ID-3.webp
    const nombreFinal = i === 0 ? `${productoId}.webp` : `${productoId}-${i + 1}.webp`;

    // Subimos o reemplazamos directamente en el Storage de Supabase
    const { error: storageError } = await window.supabaseClient.storage
      .from('productos')
      .upload(nombreFinal, imgObj.blob, { 
        contentType: 'image/webp', 
        upsert: true // Sobrescribe la versión anterior si existía
      });

    if (!storageError) {
      // Guardamos el nombre con timestamp para romper caché
      nombresDefinitivos.push(`${nombreFinal}?v=${Date.now()}`);
    }
  }

  // Actualizamos el campo VACIO (o imagen) en la tabla 'productos'
  const cadenaFinal = nombresDefinitivos.join(',');
  const { error: dbError } = await window.supabaseClient
    .from('productos')
    .update({ VACIO: cadenaFinal }) // Cambia 'VACIO' si tu columna se llama distinto
    .eq('codigo', productoId);

  if (!dbError) {
    alert('Imágenes guardadas y ordenadas correctamente');
    imagenesSeleccionadas = []; // Reiniciamos el array
  }
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

    // Al terminar de escribir el ID (ej. creando un producto nuevo), buscamos si ya
    // existen imágenes subidas al bucket con ese ID y las incorporamos a la galería.
    document.getElementById("f-id")?.addEventListener("blur", () => {
        if (!editandoId) sincronizarImagenesConBucket();
    });
});