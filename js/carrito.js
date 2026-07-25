// ===============================
// CARRITO ORIZA ART
// ===============================

let carrito = JSON.parse(localStorage.getItem("orizaCarrito")) || [];

function guardarCarrito() {
    localStorage.setItem("orizaCarrito", JSON.stringify(carrito));
    actualizarContador();
}

function agregarProducto(producto) {

    const existe = carrito.find(p => p.id === producto.id);

    if (!existe) {
        carrito.push({
            ...producto,
            cantidad: 1
        });

        guardarCarrito();
    }
}

function quitarProducto(id) {

    carrito = carrito.filter(p => p.id !== id);

    guardarCarrito();
}

function actualizarContador() {

    const contador = document.getElementById("carrito-contador");

    if (!contador) return;

    contador.textContent = carrito.length;
}

document.addEventListener("DOMContentLoaded", actualizarContador);