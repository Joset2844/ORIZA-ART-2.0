let productosCache = null;

async function obtenerProductos() {
    if (productosCache) return productosCache;
    productosCache = await cargarProductos();
    return productosCache;
}

async function iniciarProducto() {

    const productos = await obtenerProductos();
    const parametros = new URLSearchParams(window.location.search);
    const id = Number(parametros.get("id"));

    const producto = productos.find(p => p.id === id);

    if (!producto) {
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
            `Hola 👋, me interesa ${producto.nombre}.`
        )}`;
    }

}

iniciarProducto();