async function iniciarProducto() {

    const productos = await cargarProductos();

    const parametros = new URLSearchParams(window.location.search);

    const id = Number(parametros.get("id"));

    const producto = productos.find(p => p.id === id);

    if (!producto) {
        window.location.href = "catalogo.html";
        return;
    }

    document.getElementById("imgProducto").src = producto.imagen;
    document.getElementById("imgProducto").alt = producto.nombre;

    document.getElementById("nombreProducto").textContent = producto.nombre;

    document.title = `${producto.nombre} | ORIZA ART`;
    
    document.getElementById("precioProducto").textContent =
    `S/ ${producto.precio.toFixed(2)}`;

    document.getElementById("descripcionProducto").textContent = producto.descripcion;
    
    document.getElementById("materialesProducto").innerHTML =
    `<strong>Materiales:</strong> ${producto.materiales.join(", ")}`;

    document.getElementById("categoriaProducto").textContent = producto.categoria;

    document.getElementById("btnWhatsapp").href =
        `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(
            `Hola 👋, me interesa ${producto.nombre}.`
        )}`;

}

iniciarProducto();