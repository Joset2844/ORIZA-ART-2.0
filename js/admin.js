// ============================================
// PANEL DE ADMINISTRACIÓN — ORIZA ART
// ============================================

// Pega aquí tu URL de Apps Script (ver ADMIN_SETUP.md)
const ADMIN_API_URL = "https://script.google.com/macros/s/AKfycbyZCsQuykEiyuyS-85W0y4wV4ANszeSaPfo0I00lWC9YiZLrXJ6j_Y_lpS93al3GliBig/exec";

const SESSION_KEY = "orizaAdminPass";

let productosAdmin = [];
let editandoId = null;

function getPassword() {
    return sessionStorage.getItem(SESSION_KEY) || "";
}

async function llamarApi(params, metodo, body) {

    if (metodo === "POST") {
        const res = await fetch(ADMIN_API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" }, // evita preflight CORS
            body: JSON.stringify({ ...body, password: getPassword() })
        });
        return res.json();
    }

    const query = new URLSearchParams({ ...params, password: getPassword() }).toString();
    const res = await fetch(`${ADMIN_API_URL}?${query}`);
    return res.json();
}

async function iniciarSesion(password) {

    sessionStorage.setItem(SESSION_KEY, password);

    let data;
    try {
        data = await llamarApi({ action: "listar" });
    } catch (error) {
        mostrarErrorLogin("No se pudo conectar con el backend. Revisa ADMIN_API_URL en admin.js.");
        return false;
    }

    if (data.error) {
        sessionStorage.removeItem(SESSION_KEY);
        mostrarErrorLogin(data.error === "Clave incorrecta" ? "Contraseña incorrecta." : data.error);
        return false;
    }

    productosAdmin = data.productos;
    mostrarPanel();
    renderizarTabla();
    return true;
}

function mostrarErrorLogin(msg) {
    const el = document.getElementById("login-error");
    if (el) {
        el.textContent = msg;
        el.hidden = false;
    }
}

function mostrarPanel() {
    document.getElementById("login-vista").hidden = true;
    document.getElementById("panel-vista").hidden = false;
}

function cerrarSesion() {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
}

function renderizarTabla() {

    const tbody = document.getElementById("tabla-productos");
    if (!tbody) return;

    tbody.innerHTML = productosAdmin.map(p => {
        const activo = (p.estado || "").toString().toLowerCase() === "activo";
        return `
            <tr class="${activo ? "" : "fila-inactiva"}">
                <td>${p.id}</td>
                <td>${p.nombre}</td>
                <td>${p.tipo}</td>
                <td>S/ ${Number(p.precio || 0).toFixed(2)}</td>
                <td>
                    <input type="number" min="0" class="input-stock" data-id="${p.id}" value="${p.stock ?? 0}">
                </td>
                <td>
                    <button class="badge-estado ${activo ? "activo" : "inactivo"}" data-accion="toggle-estado" data-id="${p.id}">
                        ${activo ? "Activo" : "Inactivo"}
                    </button>
                </td>
                <td class="acciones-tabla">
                    <button data-accion="editar" data-id="${p.id}" aria-label="Editar">✎</button>
                    <button data-accion="eliminar" data-id="${p.id}" aria-label="Eliminar">🗑</button>
                </td>
            </tr>
        `;
    }).join("") || `<tr><td colspan="7" class="tabla-vacia">Aún no hay productos.</td></tr>`;

}

function abrirFormulario(producto) {

    editandoId = producto ? producto.id : null;

    document.getElementById("form-titulo").textContent = producto ? "Editar producto" : "Nuevo producto";

    const idInput = document.getElementById("f-id");
    idInput.value = producto?.id || "";
    idInput.disabled = !!producto;

    document.getElementById("f-tipo").value = producto?.tipo || "PULSERA";
    document.getElementById("f-nombre").value = producto?.nombre || "";
    document.getElementById("f-precio").value = producto?.precio || "";
    document.getElementById("f-material").value = producto?.material || "";
    document.getElementById("f-descripcion").value = producto?.descripcion || "";

    const imagenActual = (producto?.imagen || "").toString();
    document.getElementById("f-imagen").value = imagenActual.startsWith("http") ? imagenActual : "";

    document.getElementById("f-estado").value = producto?.estado || "ACTIVO";
    document.getElementById("f-destacado").value = producto?.destacado || "NO";
    document.getElementById("f-orden").value = producto?.orden ?? 999;
    document.getElementById("f-stock").value = producto?.stock ?? 0;

    document.getElementById("form-overlay").hidden = false;

}

function cerrarFormulario() {
    document.getElementById("form-overlay").hidden = true;
}

async function guardarFormulario(e) {

    e.preventDefault();

    const id = document.getElementById("f-id").value.trim();
    if (!id) { alert("El ID es obligatorio."); return; }

    if (!editandoId && productosAdmin.some(p => p.id === id)) {
        alert("Ya existe un producto con ese ID.");
        return;
    }

    const producto = {
        id,
        tipo: document.getElementById("f-tipo").value,
        nombre: document.getElementById("f-nombre").value.trim(),
        precio: Number(document.getElementById("f-precio").value || 0),
        material: document.getElementById("f-material").value.trim(),
        descripcion: document.getElementById("f-descripcion").value.trim(),
        imagen: document.getElementById("f-imagen").value.trim(),
        estado: document.getElementById("f-estado").value,
        destacado: document.getElementById("f-destacado").value,
        orden: Number(document.getElementById("f-orden").value || 999),
        stock: Number(document.getElementById("f-stock").value || 0)
    };

    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = "Guardando..."; }

    let resultado;
    try {
        resultado = await llamarApi(null, "POST", { action: "guardar", producto });
    } catch (error) {
        resultado = { error: "No se pudo conectar con el backend." };
    }

    if (btn) { btn.disabled = false; btn.textContent = "Guardar"; }

    if (resultado.error) {
        alert("Error al guardar: " + resultado.error);
        return;
    }

    cerrarFormulario();
    await recargarProductos();

}

async function eliminarProductoAdmin(id) {

    const producto = productosAdmin.find(p => p.id === id);
    if (!producto) return;

    if (!confirm(`¿Eliminar "${producto.nombre}" definitivamente? Esta acción no se puede deshacer.`)) return;

    let resultado;
    try {
        resultado = await llamarApi(null, "POST", { action: "eliminar", id });
    } catch (error) {
        resultado = { error: "No se pudo conectar con el backend." };
    }

    if (resultado.error) {
        alert("Error al eliminar: " + resultado.error);
        return;
    }

    await recargarProductos();

}

async function actualizarStockRapido(id, nuevoStock) {

    const producto = productosAdmin.find(p => p.id === id);
    if (!producto) return;

    const actualizado = { ...producto, stock: Number(nuevoStock) };

    let resultado;
    try {
        resultado = await llamarApi(null, "POST", { action: "guardar", producto: actualizado });
    } catch (error) {
        resultado = { error: "No se pudo conectar con el backend." };
    }

    if (resultado.error) {
        alert("Error al actualizar stock: " + resultado.error);
        return;
    }

    producto.stock = Number(nuevoStock);

}

async function toggleEstado(id) {

    const producto = productosAdmin.find(p => p.id === id);
    if (!producto) return;

    const activo = (producto.estado || "").toString().toLowerCase() === "activo";
    const actualizado = { ...producto, estado: activo ? "INACTIVO" : "ACTIVO" };

    let resultado;
    try {
        resultado = await llamarApi(null, "POST", { action: "guardar", producto: actualizado });
    } catch (error) {
        resultado = { error: "No se pudo conectar con el backend." };
    }

    if (resultado.error) {
        alert("Error: " + resultado.error);
        return;
    }

    producto.estado = actualizado.estado;
    renderizarTabla();

}

async function recargarProductos() {

    let data;
    try {
        data = await llamarApi({ action: "listar" });
    } catch (error) {
        alert("No se pudo conectar con el backend.");
        return;
    }

    if (data.error) {
        alert("Error al recargar: " + data.error);
        return;
    }

    productosAdmin = data.productos;
    renderizarTabla();

}

document.addEventListener("DOMContentLoaded", () => {

    if (getPassword()) {
        iniciarSesion(getPassword());
    }

    document.getElementById("login-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const pass = document.getElementById("login-password").value;
        iniciarSesion(pass);
    });

    document.getElementById("btn-cerrar-sesion")?.addEventListener("click", cerrarSesion);
    document.getElementById("btn-nuevo")?.addEventListener("click", () => abrirFormulario(null));
    document.getElementById("form-cerrar")?.addEventListener("click", cerrarFormulario);
    document.getElementById("form-producto")?.addEventListener("submit", guardarFormulario);

    document.getElementById("tabla-productos")?.addEventListener("click", (e) => {

        const btn = e.target.closest("button[data-accion]");
        if (!btn) return;

        const id = btn.dataset.id;
        const accion = btn.dataset.accion;

        if (accion === "editar") {
            abrirFormulario(productosAdmin.find(p => p.id === id));
        } else if (accion === "eliminar") {
            eliminarProductoAdmin(id);
        } else if (accion === "toggle-estado") {
            toggleEstado(id);
        }

    });

    document.getElementById("tabla-productos")?.addEventListener("change", (e) => {
        if (e.target.classList.contains("input-stock")) {
            actualizarStockRapido(e.target.dataset.id, e.target.value);
        }
    });

});
