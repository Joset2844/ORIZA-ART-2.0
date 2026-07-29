// ============================================
// PANEL DE ADMINISTRACIÓN COMPLETO — ORIZA ART
// ============================================

const SESSION_KEY = "orizaAdminPass";

window.productosAdmin = window.productosAdmin || [];
window.productosFiltrados = window.productosFiltrados || [];
window.dbSchema = null; // Guardará los nombres exactos de tus columnas
let editandoId = null;
let ordenActual = { columna: null, ascendente: true };

// Mensajes de error
function mostrarErrorLogin(msg) {
    const el = document.getElementById("login-error");
    if (el) { el.textContent = msg; el.hidden = false; }
}

function mostrarPanel() {
    document.getElementById("loader-vista").hidden = true;
    document.getElementById("login-vista").hidden = true;
    document.getElementById("panel-vista").hidden = false;
}

// Cargar productos desde Supabase y detectar esquema (columnas exactas)
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

        // Detectar exactamente cómo se llaman las columnas en tu base de datos 
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
        aplicarFiltros(false); // Refresca aplicando filtros y orden actuales
    } catch (e) {
        console.error("Excepción en recargarProductos:", e);
    }
}

// Renderizar tabla
// Renderizar tabla
function renderizarTabla() {
    const tbody = document.getElementById("tabla-productos");
    if (!tbody) return;

    tbody.innerHTML = window.productosFiltrados.map(p => {
        const activo = (p.estado || "").toLowerCase() === "activo";
        
        // Asignación de foto apuntando al Bucket
        let fotoTabla = IMAGEN_DEFAULT_BUCKET;
        if (p.imagen && p.imagen.startsWith("http")) {
            fotoTabla = p.imagen.split(",")[0].trim();
        } else if (p.id) {
            fotoTabla = `${SUPABASE_STORAGE_URL}/${p.id}.webp`;
        }

        return `
            <tr class="${activo ? "" : "fila-inactiva"}">
                <td>${p.id}</td>
                <td>
                    <div class="producto-admin">
                        <img src="${fotoTabla}" loading="lazy" onerror="this.onerror=null; this.src='${IMAGEN_DEFAULT_BUCKET}';">
                        <div>
                            <strong>${p.nombre}</strong>
                            <small>${p.id}</small>
                        </div>
                    </div>
                </td>
                <td>${p.tipo}</td>
                <td>S/ ${Number(p.precio).toFixed(2)}</td>
                <td>
                    <div class="stock-box">
                        <input type="number" min="0" class="input-stock" data-id="${p.id}" value="${p.stock}">
                    </div>
                </td>
                <td>
                    <button class="badge-estado ${activo ? "activo" : "inactivo"}" data-accion="toggle-estado" data-id="${p.id}">
                        ${activo ? "Activo" : "Inactivo"}
                    </button>
                </td>
                <td class="acciones-tabla">
                    <button data-accion="editar" data-id="${p.id}" title="Editar">✎</button>
                    <button data-accion="eliminar" data-id="${p.id}" title="Eliminar" style="color:red;">🗑</button>
                </td>
            </tr>
        `;
    }).join("") || `<tr><td colspan="7" class="tabla-vacia">No hay productos registrados.</td></tr>`;
}

// ------------------------------------------------------------------
// NUEVO: SISTEMA DE ORDENAMIENTO DE COLUMNAS (ASC/DESC)
// ------------------------------------------------------------------
function ordenarDatos(colIndex, tipo) {
    if (ordenActual.columna === colIndex) {
        ordenActual.ascendente = !ordenActual.ascendente; // Alternar asc/desc
    } else {
        ordenActual.columna = colIndex;
        ordenActual.ascendente = true;
    }

    const mapaColumnas = {
        0: "id",
        1: "nombre",
        2: "tipo",
        3: "precio",
        4: "stock",
        5: "estado"
    };
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

    //   iconos de cabecera
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
        // Mantener orden temporal, forzamos ordenar
        const tempAsc = ordenActual.ascendente;
        ordenActual.ascendente = !tempAsc; // Hack para volver a acomodar
        ordenarDatos(ordenActual.columna, document.querySelector(`th[data-col="${ordenActual.columna}"]`)?.dataset.tipo);
    } else {
        renderizarTabla();
    }
}

// ------------------------------------------------------------------
// ACCIONES DE BASE DE DATOS USANDO EL ESQUEMA DETECTADO
// ------------------------------------------------------------------

async function guardarFormulario(e) {
    e.preventDefault();
    if (!window.dbSchema) return mostrarToast("Espera a que cargue la base de datos.", "error");

    const id = document.getElementById("f-id").value.trim().toUpperCase();
    if (!id) return mostrarToast("El ID es obligatorio.", "error");

    const inputPrincipal = document.getElementById("f-imagen-principal");
    const inputArchivo = document.getElementById("f-imagen-file");
    let urlImagen = document.getElementById("f-imagen").value.trim();

    try {
        // Determinar imagen principal y otras imágenes por separado
        const archivoPrincipal = (inputPrincipal && inputPrincipal.files.length > 0)
            ? inputPrincipal.files[0]
            : null;
        const archivosOtras = (inputArchivo && inputArchivo.files.length > 0)
            ? Array.from(inputArchivo.files)
            : [];

        if (archivoPrincipal || archivosOtras.length > 0) {
            const total = (archivoPrincipal ? 1 : 0) + archivosOtras.length;
            mostrarToast(`Subiendo ${total} imagen(es)...`, "info");

            const nuevasUrls = await subirImagenesSupabase(id, {
                principal: archivoPrincipal,
                otras: archivosOtras
            });

            if (!archivoPrincipal && urlImagen) {
                // No se subió una nueva principal: conservar la URL principal existente
                const urlPrincipalExistente = urlImagen.split(",")[0].trim();
                urlImagen = [urlPrincipalExistente, nuevasUrls].filter(Boolean).join(",");
            } else {
                urlImagen = nuevasUrls;
            }
        }

        // Construir el objeto payload
        const payload = {};
        payload[window.dbSchema.id] = id;
        payload[window.dbSchema.tipo] = document.getElementById("f-tipo").value;
        payload[window.dbSchema.nombre] = document.getElementById("f-nombre").value.trim();
        payload[window.dbSchema.precio] = Number(document.getElementById("f-precio").value || 0);
        payload[window.dbSchema.material] = document.getElementById("f-material").value.trim();
        payload[window.dbSchema.descripcion] = document.getElementById("f-descripcion").value.trim();
        payload[window.dbSchema.imagen] = urlImagen; // Se guardará una URL o URLs separadas por coma
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

            let maxN = 0;
            if (!maxError && maxResult && maxResult.length > 0) {
                maxN = Number(maxResult[0]['N°'] || 0);
            } else {
                maxN = window.productosAdmin.length;
            }

            payload["N°"] = maxN + 1;

            const res = await supabaseClient.from('productos').insert([payload]);
            error = res.error;
        }

        if (error) throw error;

        sessionStorage.removeItem("oriza_productos_cache");

        mostrarToast(editandoId ? "Producto actualizado correctamente" : "Producto creado correctamente", "exito");
        
        if (inputPrincipal) inputPrincipal.value = "";
        if (inputArchivo) inputArchivo.value = "";
        
        cerrarFormulario();
        await recargarProductos();
    } catch (err) {
        mostrarToast("Error: " + err.message, "error");
    }
}

// Convierte un archivo de imagen (jpg, png, etc.) a un Blob en formato WEBP usando canvas
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
                    if (!blob) {
                        reject(new Error(`No se pudo convertir "${file.name}" a WEBP (el navegador no devolvió datos).`));
                        return;
                    }
                    resolve(blob);
                },
                'image/webp',
                calidad
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error(`No se pudo leer la imagen "${file.name}" para convertirla a WEBP.`));
        };

        img.src = objectUrl;
    });
}

// Sube la imagen principal y las imágenes secundarias de un producto a Supabase Storage.
// La principal siempre se guarda como {id}.webp (sin sufijo).
// Las secundarias se guardan como {id}-2.webp, {id}-3.webp, etc.
async function subirImagenesSupabase(idProducto, { principal = null, otras = [] } = {}) {
    const BUCKET_NAME = 'productos';
    const urlsGuardadas = [];

    const subirUnaImagen = async (file, filePath, indiceLog, totalLog) => {
        console.log(`Convirtiendo y subiendo imagen ${indiceLog} de ${totalLog}:`, filePath);

        let blobWebp;
        try {
            blobWebp = await convertirImagenAWebp(file);
        } catch (convError) {
            console.error(`Error convirtiendo la imagen ${file.name}:`, convError);
            throw new Error(`Error al convertir imagen ${indiceLog} a WEBP: ` + convError.message);
        }

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

        return urlData.publicUrl;
    };

    const totalLog = (principal ? 1 : 0) + otras.length;
    let indiceLog = 1;

    // 1. Imagen principal: siempre sin sufijo
    if (principal) {
        const filePath = `${idProducto}.webp`;
        urlsGuardadas.push(await subirUnaImagen(principal, filePath, indiceLog, totalLog));
        indiceLog++;
    }

    // 2. Imágenes secundarias: sufijo desde -2
    for (let i = 0; i < otras.length; i++) {
        const filePath = `${idProducto}-${i + 2}.webp`;
        urlsGuardadas.push(await subirUnaImagen(otras[i], filePath, indiceLog, totalLog));
        indiceLog++;
    }

    // Retorna un string con las URLs separadas por coma
    return urlsGuardadas.join(',');
}

async function eliminarProducto(id) {
    if (!confirm(`¿Estás seguro de eliminar el producto ${id}?`)) return;
    try {
        const { error } = await supabaseClient.from('productos').delete().eq(window.dbSchema.id, id);
        if (error) throw error;
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
        mostrarToast(`Estado cambiado a ${nuevoEstado}`, "exito");
        await recargarProductos();
    } catch (err) { mostrarToast("Error al cambiar estado", "error"); }
}

// ------------------------------------------------------------------
// FORMULARIOS, LOGIN, EVENT LISTENERS Y PREVIEW
// ------------------------------------------------------------------
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

// Función para subir una imagen a Supabase Storage (convierte a WEBP antes de subir)
async function subirImagenSupabase(file, nombreArchivo) {
    // Reemplaza 'productos' si le pusiste otro nombre a tu bucket
    const BUCKET_NAME = 'productos'; 
    
    const filePath = `${nombreArchivo}.webp`;
    const blobWebp = await convertirImagenAWebp(file);

    // 1. Subir el archivo al bucket
    const { data, error } = await supabaseClient
        .storage
        .from(BUCKET_NAME)
        .upload(filePath, blobWebp, {
            cacheControl: '3600',
            upsert: true, // Sobrescribe el archivo si ya existe
            contentType: 'image/webp'
        });

    if (error) {
        throw new Error("Error al subir la imagen: " + error.message);
    }

    // 2. Obtener la URL pública de la imagen subida
    const { data: publicUrlData } = supabaseClient
        .storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

    return publicUrlData.publicUrl; // Retorna https://xyz.supabase.co/storage/v1/object/public/productos/...
}

function abrirFormulario(producto = null) {
    editandoId = producto ? producto.id : null;
    const overlay = document.getElementById("form-overlay");

    document.querySelectorAll("#form-producto input, #form-producto select, #form-producto textarea").forEach(elemento => {
    elemento.addEventListener("input", actualizarPreview);
    elemento.addEventListener("change", actualizarPreview);
});

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

    // Limpiar cualquier archivo seleccionado en una edición anterior
    const inputImagenPrincipal = document.getElementById("f-imagen-principal");
    const inputImagenFile = document.getElementById("f-imagen-file");
    if (inputImagenPrincipal) inputImagenPrincipal.value = "";
    if (inputImagenFile) inputImagenFile.value = "";

    actualizarPreview();
    overlay.hidden = false;
}

function cerrarFormulario() {
    document.getElementById("form-overlay").hidden = true;
    editandoId = null;
}

// 1. Escuchador de archivo local (SE AGREGA UNA SOLA VEZ FUERA DE LA FUNCIÓN)
document.addEventListener("DOMContentLoaded", () => {
    const inputImagenPrincipal = document.getElementById("f-imagen-principal");
    const inputImagenFile = document.getElementById("f-imagen-file");

    const manejarCambioArchivo = (e) => {
        const prevImg = document.getElementById("preview-img");
        const archivos = e.target.files;

        if (archivos && archivos.length > 0 && prevImg) {
            // Muestra la imagen local seleccionada de inmediato
            prevImg.src = URL.createObjectURL(archivos[0]);
        } else {
            // Si limpia la selección, vuelve a evaluar el formulario
            actualizarPreview();
        }
    };

    if (inputImagenPrincipal) {
        inputImagenPrincipal.addEventListener("change", manejarCambioArchivo);
    }
    if (inputImagenFile) {
        inputImagenFile.addEventListener("change", manejarCambioArchivo);
    }
});

// 2. Función actualizarPreview limpia
function actualizarPreview() {
    // 1. Capturar los valores de los inputs
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

    // 2. Actualizar textos básicos
    if (document.getElementById("preview-nombre")) {
        document.getElementById("preview-nombre").textContent = nombre;
    }
    if (document.getElementById("preview-precio")) {
        document.getElementById("preview-precio").textContent = `S/ ${precio}`;
    }
    if (document.getElementById("preview-tipo")) {
        document.getElementById("preview-tipo").textContent = tipo;
    }

    // 3. Actualizar Materiales y Descripción
    if (document.getElementById("preview-material")) {
        document.getElementById("preview-material").textContent = `Materiales: ${material}`;
    }
    if (document.getElementById("preview-descripcion")) {
        document.getElementById("preview-descripcion").textContent = descripcion;
    }

    // 4. Actualizar Stock / Disponibilidad
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

    // 5. Actualizar insignia de Destacado
    const elDestacado = document.getElementById("preview-destacado");
    if (elDestacado) {
        elDestacado.hidden = destacado !== "SI";
    }

    // 6. Actualizar Imagen en vista previa apuntando al Bucket
    const prevImg = document.getElementById("preview-img");
    if (prevImg) {
        if (inputImagenPrincipal && inputImagenPrincipal.files && inputImagenPrincipal.files.length > 0) {
            prevImg.src = URL.createObjectURL(inputImagenPrincipal.files[0]);
        } else if (inputImagenFile && inputImagenFile.files && inputImagenFile.files.length > 0) {
            prevImg.src = URL.createObjectURL(inputImagenFile.files[0]);
        } else if (img && img.trim() !== "") {
            const primeraUrl = img.split(",")[0].trim();
            prevImg.src = primeraUrl;
        } else if (id && id.trim() !== "") {
            prevImg.src = `${SUPABASE_STORAGE_URL}/${id.trim().toUpperCase()}.webp`;
        } else {
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

    // Tabla: Eventos Click en Botones de Fila
    document.getElementById("tabla-productos")?.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-accion]");
        if (!btn) return;
        const id = btn.dataset.id;
        const accion = btn.dataset.accion;

        if (accion === "editar") abrirFormulario(window.productosAdmin.find(p => p.id === id));
        else if (accion === "eliminar") eliminarProducto(id);
        else if (accion === "toggle-estado") toggleEstado(id);
    });

    // Tabla: Modificar Input de Stock
    document.getElementById("tabla-productos")?.addEventListener("change", (e) => {
        if (e.target.classList.contains("input-stock")) {
            actualizarStockRapido(e.target.dataset.id, e.target.value);
        }
    });

    // Tabla: Click en Cabeceras para ORDENAR (Filtros superiores ASC/DESC)
    document.querySelectorAll("th[data-col]").forEach(th => {
        th.style.cursor = "pointer"; // Poner el cursor tipo mano para click
        th.addEventListener("click", () => {
            ordenarDatos(parseInt(th.dataset.col), th.dataset.tipo);
        });
    });

    // Filtros de búsqueda (inputs)
    document.getElementById("buscar-producto")?.addEventListener("input", () => aplicarFiltros(true));
    document.getElementById("filtro-tipo")?.addEventListener("change", () => aplicarFiltros(true));
    document.getElementById("filtro-estado")?.addEventListener("change", () => aplicarFiltros(true));

    ["f-id", "f-nombre", "f-precio", "f-imagen", "f-tipo"].forEach(id => {
        document.getElementById(id)?.addEventListener("input", actualizarPreview);
    });
});