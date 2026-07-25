let productosCache = null;

async function obtenerProductos() {
    if (productosCache) return productosCache;
    productosCache = await cargarProductos();
    return productosCache;
}

async function iniciarProducto() {

    try {
        const productos = await obtenerProductos();
        const parametros = new URLSearchParams(window.location.search);
        const id = Number(parametros.get("id"));

        console.log("🔍 Buscando producto con ID:", id);
        console.log("📦 Productos disponibles:", productos.map(p => ({ id: p.id, nombre: p.nombre })));

        const producto = productos.find(p => p.id === id);

        if (!producto) {
            console.warn("❌ Producto no encontrado");
            document.title = "Producto no encontrado | ORIZA ART";
            document.body.innerHTML = `
                <div style="text-align:center; padding:60px 20px;">
                    <h1>Producto no disponible</h1>
                    <p>El producto que buscas no existe o fue removido.</p>
                    <a href="catalogo.html" class="btn">Volver al catálogo</a>
                </div>
            `;
            return;
        }

        console.log("✅ Producto encontrado:", producto.nombre);

        document.title = `${producto.nombre} | ORIZA ART`;
        
        const img = document.getElementById("imgProducto");
        if (img) {
            img.src = producto.imagen;
            img.alt = producto.nombre;
        }

        const nombre = document.getElementById("nombreProducto");
        if (nombre) nombre.textContent = producto.nombre;

        const precio = document.getElementById("precioProducto");
        if (precio) precio.textContent = `S/ ${producto.precio.toFixed(2)}`;

        const desc = document.getElementById("descripcionProducto");
        if (desc) desc.textContent = producto.descripcion;
        
        const mat = document.getElementById("materialesProducto");
        if (mat) mat.innerHTML = `<strong>Materiales:</strong> ${producto.materiales.join(", ")}`;

        const cat = document.getElementById("categoriaProducto");
        if (cat) cat.textContent = producto.categoria;

        const btn = document.getElementById("btnWhatsapp");
        if (btn) {
            btn.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(
                `Hola, me interesa ${producto.nombre}.`
            )}`;
        }

        const btnCarrito = document.getElementById("btnAgregarCarrito");
        if (btnCarrito) {
            if (producto.agotado) {
                btnCarrito.disabled = true;
                btnCarrito.textContent = "Agotado";
                btnCarrito.classList.add("agotado");
            } else {
                btnCarrito.addEventListener("click", () => {
                    agregarProducto(producto);
                });
                if (producto.stock <= 3) {
                    const aviso = document.createElement("p");
                    aviso.className = "aviso-stock";
                    aviso.textContent = `¡Solo quedan ${producto.stock} unidades!`;
                    btnCarrito.insertAdjacentElement("afterend", aviso);
                }
            }
        }

    } catch (error) {
        console.error("❌ Error al cargar producto:", error);
        document.body.innerHTML = `
            <div style="text-align:center; padding:60px 20px;">
                <h1>Error al cargar</h1>
                <p>Hubo un problema cargando el producto.</p>
                <a href="catalogo.html" class="btn">Volver al catálogo</a>
            </div>
        `;
    }

}

document.addEventListener("DOMContentLoaded", iniciarProducto);