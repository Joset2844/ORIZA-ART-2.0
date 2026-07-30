// ============================================
// PANEL DE ADMINISTRACIÓN MÓVIL — ORIZA ART
// Comparte sesión, base de datos y Storage con admin.html (misma cuenta de Supabase).
// ============================================

const SESSION_KEY = "orizaAdminPass"; // misma clave que el admin de escritorio

window.productosAdmin = window.productosAdmin || [];
window.productosFiltrados = window.productosFiltrados || [];
window.dbSchema = null;
let editandoId = null;
let ordenMovil = { prop: "orden", ascendente: true };
let imagenesSeleccionadas = [];

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

function notificarCambioCatalogo() {
  sessionStorage.removeItem("oriza_productos_cache");
  window.dispatchEvent(new CustomEvent("catalog:updated"));
}

function mostrarToast(mensaje, tipo = "info") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.className = `mostrar ${tipo}`;
  toast.textContent = mensaje;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { toast.className = ""; }, 3000);
}

// ------------------------------------------------
// Cargar productos desde Supabase y detectar esquema dinámico (igual que admin.js)
// ------------------------------------------------
async function recargarProductos() {
  if (typeof supabaseClient === "undefined") {
    console.error("supabaseClient no está inicializado.");
    return;
  }

  try {
    const { data, error } = await supabaseClient.from("productos").select("*");
    if (error) { mostrarToast("Error al cargar productos: " + error.message, "error"); return; }

    if (data && data.length > 0 && !window.dbSchema) {
      const row = data[0];
      window.dbSchema = {
        id: "codigo" in row ? "codigo" : ("ID" in row ? "ID" : ("id_codigo" in row ? "id_codigo" : "id")),
        nombre: "NOMBRE" in row ? "NOMBRE" : "nombre",
        tipo: "TIPO" in row ? "TIPO" : "tipo",
        precio: "PRECIO" in row ? "PRECIO" : "precio",
        stock: "STOCK" in row ? "STOCK" : "stock",
        estado: "ESTADO" in row ? "ESTADO" : "estado",
        destacado: "DESTACADO" in row ? "DESTACADO" : "destacado",
        material: "MATERIAL" in row ? "MATERIAL" : "material",
        descripcion: "DESCRIPCION ESPIRITUAL" in row ? "DESCRIPCION ESPIRITUAL" : "descripcion",
        imagen: "VACIO" in row ? "VACIO" : "imagen",
        orden: "ORDEN" in row ? "ORDEN" : "orden"
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
    aplicarFiltros();
  } catch (e) {
    console.error("Excepción en recargarProductos:", e);
  }
}

// ------------------------------------------------
// Render de tarjetas (reemplaza la tabla del admin de escritorio)
// ------------------------------------------------
function renderizarLista() {
  const cont = document.getElementById("lista-productos");
  if (!cont) return;

  if (!window.productosFiltrados.length) {
    cont.innerHTML = `<p class="lista-vacia">No hay productos que coincidan.</p>`;
    return;
  }

  const defaultBucket = typeof IMAGEN_DEFAULT_BUCKET !== "undefined" ? IMAGEN_DEFAULT_BUCKET : "";

  cont.innerHTML = window.productosFiltrados.map(p => {
    const activo = (p.estado || "").toLowerCase() === "activo";
    let foto = defaultBucket;
    if (p.imagen) {
      const primera = p.imagen.split(",")[0].trim();
      foto = primera.startsWith("http") ? primera : `${SUPABASE_STORAGE_URL}/${primera || p.id + ".webp"}`;
    }

    return `
      <div class="producto-card ${activo ? "" : "inactiva"}" data-id="${escapeHTML(p.id)}">
        <img class="producto-card-img" src="${escapeHTML(foto)}" loading="lazy"
             onerror="this.onerror=null; this.src='${escapeHTML(defaultBucket)}';">

        <div class="producto-card-body">
          <div class="producto-card-top">
            <div>
              <strong class="producto-card-nombre">${escapeHTML(p.nombre)}</strong>
              <small class="producto-card-id">${escapeHTML(p.id)} · ${escapeHTML(p.tipo)}</small>
            </div>
            <button type="button" class="chip-estado ${activo ? "activo" : "inactivo"}" data-accion="toggle-estado" data-id="${escapeHTML(p.id)}">
              ${activo ? "Activo" : "Inactivo"}
            </button>
          </div>

          <div class="producto-card-bottom">
            <span class="producto-card-precio">S/ ${Number(p.precio).toFixed(2)}</span>

            <div class="stock-stepper">
              <button type="button" data-accion="stock-menos" data-id="${escapeHTML(p.id)}">−</button>
              <input type="number" min="0" class="input-stock-movil" data-id="${escapeHTML(p.id)}" value="${p.stock}">
              <button type="button" data-accion="stock-mas" data-id="${escapeHTML(p.id)}">+</button>
            </div>

            <div class="producto-card-acciones">
              <button type="button" class="icon-btn" data-accion="editar" data-id="${escapeHTML(p.id)}" title="Editar">✎</button>
              <button type="button" class="icon-btn icon-btn-danger" data-accion="eliminar" data-id="${escapeHTML(p.id)}" title="Eliminar">🗑</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function ordenarMovil(prop, tipo) {
  if (ordenMovil.prop === prop) {
    ordenMovil.ascendente = !ordenMovil.ascendente;
  } else {
    ordenMovil.prop = prop;
    ordenMovil.ascendente = true;
  }

  window.productosFiltrados.sort((a, b) => {
    let valA = a[prop], valB = b[prop];
    if (tipo === "num") {
      valA = Number(valA) || 0; valB = Number(valB) || 0;
      return ordenMovil.ascendente ? valA - valB : valB - valA;
    }
    valA = valA.toString().toLowerCase(); valB = valB.toString().toLowerCase();
    if (valA < valB) return ordenMovil.ascendente ? -1 : 1;
    if (valA > valB) return ordenMovil.ascendente ? 1 : -1;
    return 0;
  });

  renderizarLista();
}

function aplicarFiltros() {
  const texto = (document.getElementById("buscar-producto")?.value || "").trim().toLowerCase();
  const tipo = document.getElementById("filtro-tipo")?.value || "";
  const estado = document.getElementById("filtro-estado")?.value || "";

  window.productosFiltrados = window.productosAdmin.filter(p => {
    const coincideTexto = p.nombre.toLowerCase().includes(texto) || p.id.toLowerCase().includes(texto);
    const coincideTipo = !tipo || p.tipo === tipo;
    const coincideEstado = !estado || p.estado === estado;
    return coincideTexto && coincideTipo && coincideEstado;
  });

  const ordenSelect = document.getElementById("orden-movil");
  if (ordenSelect && ordenSelect.value) {
    const [prop, tipoOrden] = ordenSelect.value.split("|");
    ordenMovil.prop = prop;
    window.productosFiltrados.sort((a, b) => {
      let valA = a[prop], valB = b[prop];
      if (tipoOrden === "num") { valA = Number(valA) || 0; valB = Number(valB) || 0; return valA - valB; }
      valA = valA.toString().toLowerCase(); valB = valB.toString().toLowerCase();
      return valA < valB ? -1 : (valA > valB ? 1 : 0);
    });
  }

  renderizarLista();
}

// ------------------------------------------------
// Conversión a WebP (idéntica a admin.js)
// ------------------------------------------------
function convertirAWebp(file, calidad = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(objectUrl);
        if (!blob) return reject(new Error(`No se pudo convertir "${file.name}" a WEBP.`));
        resolve(blob);
      }, "image/webp", calidad);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error(`Error leyendo la imagen "${file.name}".`)); };
    img.src = objectUrl;
  });
}

// ------------------------------------------------
// Selección, previsualización y reordenamiento de imágenes (mismo comportamiento que el admin de escritorio)
// ------------------------------------------------
async function manejarSeleccionImagenes(event) {
  const archivos = Array.from(event.target.files);
  if (!archivos.length) return;

  for (const archivo of archivos) {
    const blobWebp = await convertirAWebp(archivo);
    imagenesSeleccionadas.push({ blob: blobWebp, urlPreview: URL.createObjectURL(blobWebp), nombreTemp: null });
  }

  renderizarPrevisualizacion();
  actualizarPreview();
}

function renderizarPrevisualizacion() {
  const contenedor = document.getElementById("contenedor-preview-imagenes");
  if (!contenedor) return;
  contenedor.innerHTML = "";

  imagenesSeleccionadas.forEach((img, index) => {
    const esPrincipal = index === 0;
    const item = document.createElement("div");
    item.className = `img-preview-card ${esPrincipal ? "es-principal" : ""}`;
    item.innerHTML = `
      <div class="img-preview-thumb">
        <img src="${img.urlPreview}" alt="Vista previa ${index + 1}">
        <span class="img-preview-badge">${esPrincipal ? "⭐ Principal" : `#${index + 1}`}</span>
      </div>
      <div class="img-preview-acciones">
        ${!esPrincipal ? `<button type="button" onclick="moverAPrincipal(${index})">⭐ Principal</button>` : `<span></span>`}
        <button type="button" class="danger" onclick="eliminarImagen(${index})">🗑️ Quitar</button>
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

function actualizarPreview() {
  const nombre = document.getElementById("f-nombre")?.value || "Nombre del producto";
  const precio = Number(document.getElementById("f-precio")?.value || 0).toFixed(2);

  const prevNombre = document.getElementById("preview-nombre-movil");
  const prevPrecio = document.getElementById("preview-precio-movil");
  const prevImg = document.getElementById("preview-img-movil");

  if (prevNombre) prevNombre.textContent = nombre;
  if (prevPrecio) prevPrecio.textContent = `S/ ${precio}`;
  if (prevImg) {
    if (imagenesSeleccionadas.length > 0) {
      prevImg.src = imagenesSeleccionadas[0].urlPreview;
    } else {
      prevImg.src = "https://ltzfnsrxkkyuupwyykem.supabase.co/storage/v1/object/public/productos/no-image.webp";
    }
  }
}

// ------------------------------------------------
// Guardar formulario: renombrado en 2 fases para evitar colisiones al reordenar,
// siempre se guardan URLs públicas completas (idéntico al admin de escritorio corregido).
// ------------------------------------------------
async function guardarFormulario(e) {
  e.preventDefault();
  if (!window.dbSchema) return mostrarToast("Espera a que cargue la base de datos.", "error");

  const id = document.getElementById("f-id").value.trim().toUpperCase();
  if (!id) return mostrarToast("El ID es obligatorio.", "error");

  try {
    mostrarToast("Guardando producto e imágenes, por favor espera...", "info");

    const BUCKET_NAME = "productos";
    const timestamp = Date.now();
    const nombreFinalDePosicion = (i) => (i === 0 ? `${id}.webp` : `${id}-${i + 1}.webp`);

    // Fase 1: mover imágenes existentes a nombres temporales (evita choques al reordenar)
    const temporales = [];
    for (let i = 0; i < imagenesSeleccionadas.length; i++) {
      const img = imagenesSeleccionadas[i];
      if (!img.blob) {
        let nombreOrigen = img.nombreTemp || "";
        if (nombreOrigen.startsWith("http")) nombreOrigen = nombreOrigen.split("/").pop();
        nombreOrigen = nombreOrigen.split("?")[0];
        const nombreTemp = `_tmp_${timestamp}_${i}.webp`;
        if (nombreOrigen && nombreOrigen !== nombreTemp) {
          const { error: moveErr } = await supabaseClient.storage.from(BUCKET_NAME).move(nombreOrigen, nombreTemp);
          if (moveErr) console.warn("Aviso moviendo a temporal:", nombreOrigen, moveErr.message);
        }
        temporales[i] = nombreTemp;
      }
    }

    // Fase 2: subir nuevas / renombrar existentes a su nombre definitivo
    let listaUrls = [];
    const nombresFinales = [];
    for (let i = 0; i < imagenesSeleccionadas.length; i++) {
      const img = imagenesSeleccionadas[i];
      const nombreDestino = nombreFinalDePosicion(i);
      nombresFinales.push(nombreDestino);

      if (img.blob) {
        const { error: upErr } = await supabaseClient.storage.from(BUCKET_NAME)
          .upload(nombreDestino, img.blob, { contentType: "image/webp", upsert: true });
        if (upErr) throw upErr;
      } else {
        const { error: moveErr } = await supabaseClient.storage.from(BUCKET_NAME).move(temporales[i], nombreDestino);
        if (moveErr) console.warn("Aviso moviendo a destino final:", temporales[i], moveErr.message);
      }

      const { data: urlData } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(nombreDestino);
      listaUrls.push(`${urlData.publicUrl}?v=${timestamp}_${i}`);
    }

    // Limpieza de imágenes huérfanas (si se redujo la cantidad de fotos)
    try {
      const { data: archivosBucket } = await supabaseClient.storage.from(BUCKET_NAME).list("", { limit: 100 });
      const huerfanos = (archivosBucket || [])
        .map(a => a.name)
        .filter(nombre => {
          const sinExt = nombre.split(".")[0].toUpperCase();
          const pertenece = sinExt === id || sinExt.startsWith(`${id}-`);
          return pertenece && !nombresFinales.includes(nombre);
        });
      if (huerfanos.length > 0) await supabaseClient.storage.from(BUCKET_NAME).remove(huerfanos);
    } catch (limpiezaErr) {
      console.warn("No se pudo limpiar imágenes huérfanas:", limpiezaErr.message);
    }

    const payload = {};
    payload[window.dbSchema.id] = id;
    payload[window.dbSchema.tipo] = document.getElementById("f-tipo").value;
    payload[window.dbSchema.nombre] = document.getElementById("f-nombre").value.trim();
    payload[window.dbSchema.precio] = Number(document.getElementById("f-precio").value || 0);
    payload[window.dbSchema.material] = document.getElementById("f-material").value.trim();
    payload[window.dbSchema.descripcion] = document.getElementById("f-descripcion").value.trim();
    payload[window.dbSchema.imagen] = listaUrls.join(",");
    payload[window.dbSchema.estado] = document.getElementById("f-estado").value;
    payload[window.dbSchema.destacado] = document.getElementById("f-destacado").value;
    payload[window.dbSchema.orden] = Number(document.getElementById("f-orden").value || 999);
    payload[window.dbSchema.stock] = Number(document.getElementById("f-stock").value || 0);

    let error;
    if (editandoId) {
      const res = await supabaseClient.from("productos").update(payload).eq(window.dbSchema.id, editandoId);
      error = res.error;
    } else {
      const { data: maxResult, error: maxError } = await supabaseClient
        .from("productos").select("N°").order("N°", { ascending: false }).limit(1);
      let maxN = (!maxError && maxResult && maxResult.length > 0) ? Number(maxResult[0]["N°"] || 0) : window.productosAdmin.length;
      payload["N°"] = maxN + 1;
      const res = await supabaseClient.from("productos").insert([payload]);
      error = res.error;
    }

    if (error) throw error;

    notificarCambioCatalogo();
    mostrarToast(editandoId ? "Producto actualizado correctamente" : "Producto creado correctamente", "exito");
    cerrarFormulario();
    await recargarProductos();
  } catch (err) {
    mostrarToast("Error: " + err.message, "error");
  }
}

// ------------------------------------------------
// Acciones rápidas: eliminar, stock, estado
// ------------------------------------------------
async function eliminarProducto(id) {
  if (!confirm(`¿Estás seguro de eliminar el producto ${id}?`)) return;
  try {
    const { error } = await supabaseClient.from("productos").delete().eq(window.dbSchema.id, id);
    if (error) throw error;
    notificarCambioCatalogo();
    mostrarToast("Producto eliminado", "exito");
    await recargarProductos();
  } catch (err) { mostrarToast("Error al eliminar", "error"); }
}

async function actualizarStockRapido(id, nuevoStock) {
  if (!window.dbSchema) return;
  nuevoStock = Math.max(0, Number(nuevoStock) || 0);
  try {
    const payload = {}; payload[window.dbSchema.stock] = nuevoStock;
    const { error } = await supabaseClient.from("productos").update(payload).eq(window.dbSchema.id, id);
    if (error) throw error;
    notificarCambioCatalogo();
    const p = window.productosAdmin.find(x => x.id === id);
    if (p) p.stock = nuevoStock;
    const input = document.querySelector(`.input-stock-movil[data-id="${id}"]`);
    if (input) input.value = nuevoStock;
    mostrarToast("Stock actualizado", "exito");
  } catch (err) { mostrarToast("Error al actualizar stock", "error"); }
}

async function toggleEstado(id) {
  if (!window.dbSchema) return;
  const prod = window.productosAdmin.find(p => p.id === id);
  if (!prod) return;
  const nuevoEstado = prod.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
  const payload = {}; payload[window.dbSchema.estado] = nuevoEstado;
  try {
    const { error } = await supabaseClient.from("productos").update(payload).eq(window.dbSchema.id, id);
    if (error) throw error;
    notificarCambioCatalogo();
    mostrarToast(`Estado cambiado a ${nuevoEstado}`, "exito");
    await recargarProductos();
  } catch (err) { mostrarToast("Error al cambiar estado", "error"); }
}

async function iniciarSesion(usuario, password) {
  try {
    const { data, error } = await supabaseClient.from("usuarios")
      .select("*").ilike("usuario", usuario.trim()).eq("password", password.trim()).maybeSingle();
    if (error || !data) { mostrarErrorLogin("Usuario o contraseña incorrectos."); return false; }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ usuario: data.usuario, id: data.id }));
    mostrarPanel();
    await recargarProductos();
    return true;
  } catch (err) { return false; }
}

// ------------------------------------------------
// Formulario tipo "hoja" (sheet) deslizable desde abajo
// ------------------------------------------------
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
  document.getElementById("f-estado").value = producto?.estado || "ACTIVO";
  document.getElementById("f-destacado").value = producto?.destacado || "NO";
  document.getElementById("f-orden").value = producto?.orden || "";
  document.getElementById("f-stock").value = producto?.stock ?? 0;

  imagenesSeleccionadas = [];
  const cadenaImagenes = producto?.imagen || "";
  if (cadenaImagenes.trim() !== "") {
    const storageBaseUrl = "https://ltzfnsrxkkyuupwyykem.supabase.co/storage/v1/object/public/productos";
    cadenaImagenes.split(",").map(s => s.trim()).filter(Boolean).forEach(nombreImg => {
      const urlCompleta = nombreImg.startsWith("http") ? nombreImg : `${storageBaseUrl}/${nombreImg}`;
      imagenesSeleccionadas.push({ blob: null, urlPreview: urlCompleta, nombreTemp: nombreImg });
    });
  }

  renderizarPrevisualizacion();
  const inputImagenes = document.getElementById("inputImagenes");
  if (inputImagenes) inputImagenes.value = "";

  actualizarPreview();
  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add("abierto"));
  document.body.style.overflow = "hidden";

  // Además de lo que traiga la base de datos, revisamos si en el Storage ya
  // existen archivos con este ID y los agregamos a la galería si faltan.
  sincronizarImagenesConBucket();
}

// Busca en el bucket 'productos' archivos que empiecen con el ID indicado
// (ID.webp, ID-2.webp, ID-3.webp...) y los agrega a la galería si no están ya.
async function sincronizarImagenesConBucket() {
  const id = document.getElementById("f-id")?.value.trim().toUpperCase();
  if (!id || typeof supabaseClient === "undefined") return;

  try {
    const BUCKET_NAME = "productos";
    const { data: archivos, error } = await supabaseClient.storage.from(BUCKET_NAME).list("", { limit: 100, search: id });
    if (error) throw error;

    const coincidencias = (archivos || []).filter(a => {
      const sinExt = a.name.split(".")[0].toUpperCase();
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
        imagenesSeleccionadas.push({ blob: null, urlPreview: `${urlData.publicUrl}?v=${Date.now()}`, nombreTemp: archivo.name });
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
  if (!overlay) return;
  overlay.classList.remove("abierto");
  document.body.style.overflow = "";
  setTimeout(() => { overlay.hidden = true; editandoId = null; }, 250);
}

// ------------------------------------------------
// Listeners
// ------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  if (sessionStorage.getItem(SESSION_KEY)) { mostrarPanel(); recargarProductos(); }

  document.getElementById("login-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    iniciarSesion(document.getElementById("login-user").value, document.getElementById("login-password").value);
  });

  document.getElementById("btn-cerrar-sesion")?.addEventListener("click", () => { sessionStorage.clear(); location.reload(); });
  document.getElementById("btn-nuevo")?.addEventListener("click", () => abrirFormulario(null));
  document.getElementById("form-cerrar")?.addEventListener("click", cerrarFormulario);
  document.getElementById("form-producto")?.addEventListener("submit", guardarFormulario);
  document.getElementById("form-overlay")?.addEventListener("click", (e) => { if (e.target.id === "form-overlay") cerrarFormulario(); });

  // Delegación de eventos sobre la lista de tarjetas
  document.getElementById("lista-productos")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-accion]");
    if (!btn) return;
    const id = btn.dataset.id;
    const accion = btn.dataset.accion;

    if (accion === "editar") abrirFormulario(window.productosAdmin.find(p => p.id === id));
    else if (accion === "eliminar") eliminarProducto(id);
    else if (accion === "toggle-estado") toggleEstado(id);
    else if (accion === "stock-mas" || accion === "stock-menos") {
      const input = document.querySelector(`.input-stock-movil[data-id="${id}"]`);
      if (!input) return;
      const delta = accion === "stock-mas" ? 1 : -1;
      const nuevo = Math.max(0, Number(input.value || 0) + delta);
      input.value = nuevo;
      actualizarStockRapido(id, nuevo);
    }
  });

  document.getElementById("lista-productos")?.addEventListener("change", (e) => {
    if (e.target.classList.contains("input-stock-movil")) {
      actualizarStockRapido(e.target.dataset.id, e.target.value);
    }
  });

  document.getElementById("buscar-producto")?.addEventListener("input", aplicarFiltros);
  document.getElementById("filtro-tipo")?.addEventListener("change", aplicarFiltros);
  document.getElementById("filtro-estado")?.addEventListener("change", aplicarFiltros);
  document.getElementById("orden-movil")?.addEventListener("change", aplicarFiltros);

  document.getElementById("btn-filtros")?.addEventListener("click", () => {
    document.getElementById("panel-filtros")?.classList.toggle("abierto");
  });

  document.querySelectorAll("#form-producto input, #form-producto select, #form-producto textarea").forEach(el => {
    el.addEventListener("input", actualizarPreview);
    el.addEventListener("change", actualizarPreview);
  });

  document.getElementById("f-id")?.addEventListener("blur", () => {
    if (!editandoId) sincronizarImagenesConBucket();
  });
});
