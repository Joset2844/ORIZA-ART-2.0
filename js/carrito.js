// ===============================
// CARRITO ORIZA ART
// Se carga en todas las páginas. Persiste en localStorage,
// así que el carrito se mantiene al navegar entre páginas.
// ===============================

const CARRITO_KEY = "orizaCarrito";

let carrito = [];

try {
    carrito = JSON.parse(localStorage.getItem(CARRITO_KEY)) || [];
} catch (error) {
    carrito = [];
}

function guardarCarrito() {
    localStorage.setItem(CARRITO_KEY, JSON.stringify(carrito));
    actualizarContador();
    renderizarCarrito();
}

function agregarProducto(producto) {

    const existente = carrito.find(p => p.id === producto.id);

    if (existente) {
        existente.cantidad += 1;
    } else {
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            imagen: producto.imagen,
            cantidad: 1
        });
    }

    guardarCarrito();
    abrirCarrito();
}

function quitarProducto(id) {
    carrito = carrito.filter(p => p.id !== id);
    guardarCarrito();
}

function cambiarCantidad(id, delta) {

    const item = carrito.find(p => p.id === id);
    if (!item) return;

    item.cantidad += delta;

    if (item.cantidad <= 0) {
        quitarProducto(id);
        return;
    }

    guardarCarrito();
}

function vaciarCarrito() {
    if (!carrito.length) return;
    if (!confirm("¿Vaciar todo el carrito?")) return;
    carrito = [];
    guardarCarrito();
}

function calcularTotal() {
    return carrito.reduce((suma, p) => suma + p.precio * p.cantidad, 0);
}

function actualizarContador() {

    const contador = document.getElementById("carrito-contador");
    if (!contador) return;

    const totalItems = carrito.reduce((suma, p) => suma + p.cantidad, 0);

    contador.textContent = totalItems;
    contador.style.display = totalItems > 0 ? "flex" : "none";
}

function renderizarCarrito() {

    const lista = document.getElementById("carrito-lista");
    const totalEl = document.getElementById("carrito-total");
    const enviarBtn = document.getElementById("carrito-enviar");

    if (!lista) return; // esta página no tiene el panel del carrito

    if (!carrito.length) {

        lista.innerHTML = `
            <div class="carrito-vacio">
                <span>🛒</span>
                <p>Tu carrito está vacío</p>
                <a href="catalogo.html" class="btn">Ver colección</a>
            </div>
        `;

    } else {

        const fragment = document.createDocumentFragment();

        carrito.forEach(item => {
            const div = document.createElement("div");
            div.className = "carrito-item";
            div.innerHTML = `
                <img src="${item.imagen}" alt="${item.nombre}">
                <div class="carrito-item-info">
                    <h4>${item.nombre}</h4>
                    <span class="carrito-item-precio">S/ ${item.precio.toFixed(2)}</span>
                    <div class="carrito-item-cantidad">
                        <button class="cantidad-btn" data-accion="restar" data-id="${item.id}" aria-label="Restar">−</button>
                        <span>${item.cantidad}</span>
                        <button class="cantidad-btn" data-accion="sumar" data-id="${item.id}" aria-label="Sumar">+</button>
                    </div>
                </div>
                <button class="carrito-item-quitar" data-id="${item.id}" aria-label="Quitar producto">✕</button>
            `;
            fragment.appendChild(div);
        });

        lista.innerHTML = "";
        lista.appendChild(fragment);

    }

    if (totalEl) totalEl.textContent = `S/ ${calcularTotal().toFixed(2)}`;
    if (enviarBtn) enviarBtn.href = generarLinkWhatsApp();

}

function generarLinkWhatsApp() {

    if (!carrito.length) return "#";

    const numero = (typeof CONFIG !== "undefined" && CONFIG.whatsapp) || "";

    let mensaje = "¡Hola! 👋 Quiero hacer un pedido:\n\n";

    carrito.forEach(item => {
        mensaje += `• ${item.nombre} x${item.cantidad} — S/ ${(item.precio * item.cantidad).toFixed(2)}\n`;
    });

    mensaje += `\nTotal: S/ ${calcularTotal().toFixed(2)}`;
    mensaje += "\n\n¿Podrías confirmarme disponibilidad y tiempo de entrega? 🙂";

    return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

function abrirCarrito() {
    document.getElementById("carrito-panel")?.classList.add("abierto");
    document.getElementById("carrito-overlay")?.classList.add("visible");
    document.body.classList.add("carrito-bloqueo-scroll");
}

function cerrarCarrito() {
    document.getElementById("carrito-panel")?.classList.remove("abierto");
    document.getElementById("carrito-overlay")?.classList.remove("visible");
    document.body.classList.remove("carrito-bloqueo-scroll");
}

document.addEventListener("DOMContentLoaded", () => {

    actualizarContador();
    renderizarCarrito();

    document.getElementById("carrito-float")?.addEventListener("click", abrirCarrito);
    document.getElementById("carrito-cerrar")?.addEventListener("click", cerrarCarrito);
    document.getElementById("carrito-overlay")?.addEventListener("click", cerrarCarrito);
    document.getElementById("carrito-vaciar")?.addEventListener("click", vaciarCarrito);

    // cerrar con la tecla Escape
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") cerrarCarrito();
    });

    // delegación de eventos: sumar / restar / quitar dentro de la lista
    document.getElementById("carrito-lista")?.addEventListener("click", (e) => {

        const btnCantidad = e.target.closest(".cantidad-btn");
        if (btnCantidad) {
            const id = Number(btnCantidad.dataset.id);
            const delta = btnCantidad.dataset.accion === "sumar" ? 1 : -1;
            cambiarCantidad(id, delta);
            return;
        }

        const btnQuitar = e.target.closest(".carrito-item-quitar");
        if (btnQuitar) {
            quitarProducto(Number(btnQuitar.dataset.id));
        }

    });

    // agregar al carrito desde el catálogo (delegación, funciona
    // aunque las tarjetas se generen dinámicamente después)
    document.getElementById("lista-productos")?.addEventListener("click", (e) => {

        const btnAgregar = e.target.closest(".btn-agregar-carrito");
        if (!btnAgregar) return;

        const producto = {
            id: Number(btnAgregar.dataset.id),
            nombre: btnAgregar.dataset.nombre,
            precio: Number(btnAgregar.dataset.precio),
            imagen: btnAgregar.dataset.imagen
        };

        agregarProducto(producto);

    });

});
