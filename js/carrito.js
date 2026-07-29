// ===============================
// CARRITO ORIZA ART (EVENT-DRIVEN)
// ===============================

const CARRITO_KEY = "orizaCarrito";
const CLIENTE_KEY = "orizaCliente";

let carrito = [];
try { carrito = JSON.parse(localStorage.getItem(CARRITO_KEY)) || []; } catch (e) { carrito = []; }

let clienteGuardado = {};
try { clienteGuardado = JSON.parse(localStorage.getItem(CLIENTE_KEY)) || {}; } catch (e) { clienteGuardado = {}; }

function escapeHTML(str = "") {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function guardarCarrito() {
    localStorage.setItem(CARRITO_KEY, JSON.stringify(carrito));
    
    // Notificar al resto del sistema vía evento desacoplado
    window.dispatchEvent(new CustomEvent("cart:updated", { detail: { carrito } }));
}

function agregarProducto(producto) {
    if (producto.agotado) {
        alert("Este producto está agotado por ahora 😔");
        return;
    }

    const stockMax = producto.stock ?? 999;
    const existente = carrito.find(p => p.id === producto.id);

    if (existente) {
        if (existente.cantidad >= stockMax) {
            alert(`Solo quedan ${stockMax} unidades disponibles.`);
            return;
        }
        existente.cantidad += 1;
    } else {
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: Number(producto.precio),
            imagen: producto.imagen,
            stock: stockMax,
            cantidad: 1
        });
    }

    guardarCarrito();
    mostrarVistaLista();
    abrirCarrito();
}

function quitarProducto(id) {
    carrito = carrito.filter(p => p.id !== id);
    guardarCarrito();
}

function cambiarCantidad(id, delta) {
    const item = carrito.find(p => p.id === id);
    if (!item) return;

    if (delta > 0 && item.cantidad >= (item.stock ?? 999)) {
        alert(`Solo quedan ${item.stock} unidades disponibles.`);
        return;
    }

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
    return carrito.reduce((s, p) => s + (p.precio * p.cantidad), 0);
}

function actualizarContador() {
    const contador = document.getElementById("carrito-contador");
    if (!contador) return;
    const total = carrito.reduce((s, p) => s + p.cantidad, 0);
    contador.textContent = total;
    contador.style.display = total > 0 ? "flex" : "none";
}

function renderizarCarrito() {
    const lista = document.getElementById("carrito-lista");
    if (!lista) return;

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
            const limite = item.cantidad >= (item.stock ?? 999);
            const div = document.createElement("div");
            div.className = "carrito-item";
            div.innerHTML = `
                <img src="${escapeHTML(item.imagen)}" alt="${escapeHTML(item.nombre)}" width="60" height="60" loading="lazy">
                <div class="carrito-item-info">
                    <h4>${escapeHTML(item.nombre)}</h4>
                    <span class="carrito-item-precio">S/ ${item.precio.toFixed(2)}</span>
                    <div class="carrito-item-cantidad">
                        <button type="button" class="cantidad-btn" data-accion="restar" data-id="${item.id}" aria-label="Restar">−</button>
                        <span>${item.cantidad}</span>
                        <button type="button" class="cantidad-btn" data-accion="sumar" data-id="${item.id}" aria-label="Sumar" ${limite ? "disabled" : ""}>+</button>
                    </div>
                    ${limite ? `<span class="carrito-item-limite">Máximo disponible</span>` : ""}
                </div>
                <button type="button" class="carrito-item-quitar" data-id="${item.id}" aria-label="Quitar producto">✕</button>
            `;
            fragment.appendChild(div);
        });

        lista.innerHTML = "";
        lista.appendChild(fragment);
    }

    document.querySelectorAll("#carrito-total, #carrito-total-2").forEach(el => {
        el.textContent = `S/ ${calcularTotal().toFixed(2)}`;
    });
}

/*=========================
  VISTAS: LISTA <-> CHECKOUT
==========================*/

function mostrarVistaLista() {
    document.getElementById("carrito-vista-lista")?.removeAttribute("hidden");
    document.getElementById("carrito-vista-checkout")?.setAttribute("hidden", "");
    document.getElementById("footer-lista")?.removeAttribute("hidden");
    document.getElementById("footer-checkout")?.setAttribute("hidden", "");
}

function mostrarVistaCheckout() {
    if (!carrito.length) return;
    renderizarFormularioCheckout();
    document.getElementById("carrito-vista-lista")?.setAttribute("hidden", "");
    document.getElementById("carrito-vista-checkout")?.removeAttribute("hidden");
    document.getElementById("footer-lista")?.setAttribute("hidden", "");
    document.getElementById("footer-checkout")?.removeAttribute("hidden");
}

function renderizarFormularioCheckout() {
    const cont = document.getElementById("carrito-checkout");
    if (!cont) return;

    const c = clienteGuardado;

    cont.innerHTML = `
        <label class="campo">
            <span>Nombre completo *</span>
            <input type="text" id="cf-nombre" value="${escapeHTML(c.nombre || "")}" placeholder="Ej. María Torres">
        </label>

        <span class="campo-label">Tipo de entrega *</span>
        <div class="entrega-opciones">
            <label class="opcion-entrega">
                <input type="radio" name="cf-entrega" value="delivery" ${c.entrega !== "recojo" ? "checked" : ""}>
                🚚 Delivery
            </label>
            <label class="opcion-entrega">
                <input type="radio" name="cf-entrega" value="recojo" ${c.entrega === "recojo" ? "checked" : ""}>
                🏠 Recojo
            </label>
        </div>

        <div id="cf-direccion-campos">
            <label class="campo">
                <span>Distrito *</span>
                <input type="text" id="cf-distrito" value="${escapeHTML(c.distrito || "")}" placeholder="Ej. Miraflores">
            </label>
            <label class="campo">
                <span>Dirección *</span>
                <input type="text" id="cf-direccion" value="${escapeHTML(c.direccion || "")}" placeholder="Calle, número">
            </label>
            <label class="campo">
                <span>Referencia</span>
                <input type="text" id="cf-referencia" value="${escapeHTML(c.referencia || "")}" placeholder="Ej. frente al parque">
            </label>
        </div>

        <label class="campo">
            <span>Método de pago preferido</span>
            <select id="cf-pago">
                <option value="Yape" ${c.pago === "Yape" ? "selected" : ""}>Yape</option>
                <option value="Plin" ${c.pago === "Plin" ? "selected" : ""}>Plin</option>
                <option value="Transferencia" ${c.pago === "Transferencia" ? "selected" : ""}>Transferencia bancaria</option>
                <option value="Efectivo" ${c.pago === "Efectivo" ? "selected" : ""}>Efectivo contra entrega</option>
            </select>
        </label>

        <label class="campo">
            <span>Comentario adicional</span>
            <textarea id="cf-comentario" rows="2" placeholder="Opcional">${escapeHTML(c.comentario || "")}</textarea>
        </label>

        <p id="cf-error" class="cf-error" hidden></p>
    `;

    actualizarEntregaUI();

    cont.querySelectorAll('input[name="cf-entrega"]').forEach(radio => {
        radio.addEventListener("change", actualizarEntregaUI);
    });
}

function actualizarEntregaUI() {
    document.querySelectorAll('input[name="cf-entrega"]').forEach(r => {
        r.closest(".opcion-entrega")?.classList.toggle("seleccionada", r.checked);
    });

    const esDelivery = document.querySelector('input[name="cf-entrega"]:checked')?.value !== "recojo";
    const campos = document.getElementById("cf-direccion-campos");
    if (campos) campos.style.display = esDelivery ? "flex" : "none";
}

/*=========================
  ENVÍO DEL PEDIDO
==========================*/

function generarLinkWhatsApp(datos) {
    const numero = (typeof CONFIG !== "undefined" && CONFIG.whatsapp) || "";
    let mensaje = `¡Hola! Soy ${datos.nombre} y quiero hacer este pedido:\n\n`;

    carrito.forEach(item => {
        mensaje += `• ${item.nombre} x${item.cantidad} — S/ ${(item.precio * item.cantidad).toFixed(2)}\n`;
    });

    mensaje += `\nTotal: S/ ${calcularTotal().toFixed(2)}\n`;
    mensaje += `\nEntrega: ${datos.entrega === "recojo" ? "Recojo en tienda" : "Delivery"}\n`;

    if (datos.entrega !== "recojo") {
        mensaje += `Distrito: ${datos.distrito}\n`;
        mensaje += `Dirección: ${datos.direccion}\n`;
        if (datos.referencia) mensaje += `Referencia: ${datos.referencia}\n`;
    }

    mensaje += `Pago preferido: ${datos.pago}\n`;
    if (datos.comentario) mensaje += `\nComentario: ${datos.comentario}\n`;
    mensaje += "\n¿Podrías confirmarme disponibilidad y tiempo de entrega?";

    return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

async function confirmarPedido() {
    const nombre = document.getElementById("cf-nombre")?.value.trim();
    const entrega = document.querySelector('input[name="cf-entrega"]:checked')?.value || "delivery";
    const distrito = document.getElementById("cf-distrito")?.value.trim();
    const direccion = document.getElementById("cf-direccion")?.value.trim();
    const referencia = document.getElementById("cf-referencia")?.value.trim();
    const pago = document.getElementById("cf-pago")?.value;
    const comentario = document.getElementById("cf-comentario")?.value.trim();
    const errorEl = document.getElementById("cf-error");

    if (!nombre || (entrega === "delivery" && (!distrito || !direccion))) {
        if (errorEl) {
            errorEl.textContent = "Por favor completa los campos obligatorios (*).";
            errorEl.hidden = false;
        }
        return;
    }

    if (errorEl) errorEl.hidden = true;

    const btnEnviar = document.getElementById("carrito-enviar");
    const textoOriginal = btnEnviar ? btnEnviar.textContent : "";

    if (btnEnviar) {
        btnEnviar.disabled = true;
        btnEnviar.textContent = "Verificando disponibilidad...";
    }

    // Revalidación contra el origen de productos
    if (typeof cargarProductos === "function") {
        try {
            const productosActuales = await cargarProductos();
            let huboCambios = false;

            carrito = carrito
                .map(item => {
                    const actual = productosActuales.find(p => p.id === item.id);
                    if (!actual || actual.agotado) {
                        huboCambios = true;
                        return null;
                    }
                    if (item.cantidad > actual.stock) {
                        huboCambios = true;
                        return { ...item, cantidad: actual.stock, stock: actual.stock };
                    }
                    return item;
                })
                .filter(Boolean);

            if (huboCambios) {
                guardarCarrito();

                if (btnEnviar) {
                    btnEnviar.disabled = false;
                    btnEnviar.textContent = textoOriginal;
                }

                if (!carrito.length) {
                    alert("Uno de tus productos ya no está disponible. Tu carrito quedó vacío.");
                } else {
                    alert("Algunas cantidades se ajustaron por cambios en el stock disponible.");
                }

                mostrarVistaLista();
                return;
            }
        } catch (error) {
            console.error("Error al revalidar el stock:", error);
        }
    }

    if (btnEnviar) {
        btnEnviar.disabled = false;
        btnEnviar.textContent = textoOriginal;
    }

    clienteGuardado = { nombre, entrega, distrito, direccion, referencia, pago, comentario };
    localStorage.setItem(CLIENTE_KEY, JSON.stringify(clienteGuardado));

    const link = generarLinkWhatsApp(clienteGuardado);
    window.open(link, "_blank");

    carrito = [];
    guardarCarrito();
    mostrarVistaLista();
    cerrarCarrito();
}

/*=========================
  PANEL Y EVENT LISTENERS
==========================*/

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

// Reacción automática ante cambios en el carrito (Pub-Sub)
window.addEventListener("cart:updated", () => {
    actualizarContador();
    renderizarCarrito();
});

document.addEventListener("DOMContentLoaded", () => {
    actualizarContador();
    renderizarCarrito();
    mostrarVistaLista();

    document.getElementById("carrito-float")?.addEventListener("click", abrirCarrito);
    document.getElementById("carrito-cerrar")?.addEventListener("click", cerrarCarrito);
    document.getElementById("carrito-overlay")?.addEventListener("click", cerrarCarrito);
    document.getElementById("carrito-vaciar")?.addEventListener("click", vaciarCarrito);
    document.getElementById("carrito-continuar")?.addEventListener("click", mostrarVistaCheckout);
    document.getElementById("carrito-volver")?.addEventListener("click", mostrarVistaLista);
    document.getElementById("carrito-enviar")?.addEventListener("click", confirmarPedido);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") cerrarCarrito();
    });

    document.getElementById("carrito-lista")?.addEventListener("click", (e) => {
        const btnCantidad = e.target.closest(".cantidad-btn");
        if (btnCantidad) {
            const id = Number(btnCantidad.dataset.id);
            const delta = btnCantidad.dataset.accion === "sumar" ? 1 : -1;
            cambiarCantidad(id, delta);
            return;
        }

        const btnQuitar = e.target.closest(".carrito-item-quitar");
        if (btnQuitar) quitarProducto(Number(btnQuitar.dataset.id));
    });

    document.getElementById("lista-productos")?.addEventListener("click", (e) => {
        const btnAgregar = e.target.closest(".btn-agregar-carrito");
        if (!btnAgregar || btnAgregar.disabled) return;

        agregarProducto({
            id: Number(btnAgregar.dataset.id),
            nombre: btnAgregar.dataset.nombre,
            precio: Number(btnAgregar.dataset.precio),
            imagen: btnAgregar.dataset.imagen,
            stock: Number(btnAgregar.dataset.stock),
            agotado: btnAgregar.dataset.agotado === "true"
        });
    });
});