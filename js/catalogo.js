/*=========================
  CATÁLOGO DINÁMICO E INTERACTIVO
=========================*/

const contenedor = document.getElementById("lista-productos");
const buscador = document.getElementById("buscarProducto");
const selectOrden = document.getElementById("selectOrden");
const btnVistaGrid = document.getElementById("btnVistaGrid");
const btnVistaList = document.getElementById("btnVistaList");

let productos = [];
let categoriaActual = "todos";

// Reemplaza tus funciones mostrarProductos e iniciarCatalogo por estas:

let productosCache = null;

async function obtenerProductosConCache() {
    const cacheLocal = sessionStorage.getItem("oriza_productos_cache");
    if (cacheLocal) {
        return JSON.parse(cacheLocal);
    }
    const productosServidor = await cargarProductos();
    if (productosServidor && productosServidor.length > 0) {
        sessionStorage.setItem("oriza_productos_cache", JSON.stringify(productosServidor));
    }
    return productosServidor;
}

function mostrarProductos(categoria = "todos", texto = "") {
    let filtrados = productos.filter(producto => {
        let coincideCategoria = false;
        
        if (categoria === "favoritos") {
            coincideCategoria = esFavorito(producto.id);
        } else {
            coincideCategoria = categoria === "todos" || producto.categoria.toLowerCase() === categoria;
        }

        const coincideTexto = producto.nombre.toLowerCase().includes(texto.toLowerCase());
        return coincideCategoria && coincideTexto;
    });

    const criterioOrden = selectOrden.value;
    filtrados.sort((a, b) => {
        if (criterioOrden === "precio-asc") return a.precio - b.precio;
        if (criterioOrden === "precio-desc") return b.precio - a.precio;
        if (a.agotado !== b.agotado) return a.agotado ? 1 : -1;
        if (a.destacado !== b.destacado) return b.destacado ? 1 : -1;
        return a.id - b.id;
    });

    const fragment = document.createDocumentFragment();

    filtrados.forEach(producto => {
        const esFav = esFavorito(producto.id);
        const article = document.createElement("article");
        article.className = "card-producto" + (producto.agotado ? " agotado" : "");
        article.innerHTML = `
            <div class="card-imagen-wrap">
                <button 
                    class="btn-favorito-card ${esFav ? "activo" : ""}" 
                    data-id="${producto.id}"
                    title="${esFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}"
                >
                    ${esFav ? '❤️' : '🤍'}
                </button>
                <img 
                    src="${producto.imagen}" 
                    alt="${producto.nombre}" 
                    loading="lazy"
                    decoding="async"
                    onerror="this.onerror=null; this.src='img/no-image.webp';"
                >
                ${producto.agotado
                    ? '<span class="badge-agotado">Agotado</span>'
                    : (producto.stock <= 3 ? `<span class="badge-stock">¡Últimas ${producto.stock}!</span>` : "")}
            </div>
            <div class="card-info">
                <span class="categoria">${producto.categoria}</span>
                <h3>${producto.nombre}</h3>
                <p>${producto.descripcion}</p>
                <span class="card-precio">S/ ${producto.precio.toFixed(2)}</span>
                <div class="card-acciones">
                    <a href="producto.html?id=${producto.id}" class="btn-producto">
                        Ver detalles
                    </a>
                    <button 
                        class="btn-compartir-card" 
                        data-nombre="${producto.nombre}"
                        data-desc="${producto.descripcion}"
                        data-id="${producto.id}"
                        title="Compartir producto"
                    >
                        🔗
                    </button>
                    <button
                        class="btn-agregar-carrito"
                        data-id="${producto.id}"
                        data-nombre="${producto.nombre}"
                        data-precio="${producto.precio}"
                        data-imagen="${producto.imagen}"
                        data-stock="${producto.stock}"
                        data-agotado="${producto.agotado}"
                        ${producto.agotado ? "disabled" : ""}
                    >
                        🛒
                    </button>
                </div>
            </div>
        `;
        fragment.appendChild(article);
    });

    contenedor.innerHTML = "";
    if (filtrados.length === 0 && categoria === "favoritos") {
        contenedor.innerHTML = `
            <div style="text-align:center; grid-column: 1/-1; padding: 40px 20px;">
                <p>Aún no has guardado productos favoritos. ❤️</p>
            </div>
        `;
    } else {
        contenedor.appendChild(fragment);
    }

    requestAnimationFrame(() => {
        contenedor.classList.add("cargado");
    });
}

// Escuchadores de eventos para Favoritos y Compartir en el Catálogo
contenedor.addEventListener("click", (e) => {
    // Favorito
    const btnFav = e.target.closest(".btn-favorito-card");
    if (btnFav) {
        const id = btnFav.dataset.id;
        const ahoraEsFav = toggleFavorito(id);
        btnFav.classList.toggle("activo", ahoraEsFav);
        btnFav.innerHTML = ahoraEsFav ? '❤️' : '🤍';
        btnFav.title = ahoraEsFav ? 'Quitar de favoritos' : 'Agregar a favoritos';
        
        // Si estamos viendo la pestaña de favoritos, refrescamos la lista
        if (categoriaActual === "favoritos") {
            mostrarProductos(categoriaActual, buscador.value);
        }
        return;
    }

    // Compartir
    const btnShare = e.target.closest(".btn-compartir-card");
    if (btnShare) {
        const nombre = btnShare.dataset.nombre;
        const desc = btnShare.dataset.desc;
        const id = btnShare.dataset.id;
        const url = `${window.location.origin}/producto.html?id=${id}`;
        compartirProducto(nombre, desc, url);
    }
});

// Inicialización optimizada
async function iniciarCatalogo() {
    productos = await obtenerProductosConCache();
    mostrarProductos();
}

iniciarCatalogo();

iniciarCatalogo();

// Eventos de Filtro y Buscador
document.querySelectorAll(".filtro").forEach(boton => {
    boton.addEventListener("click", () => {
        categoriaActual = boton.dataset.categoria;
        document.querySelector(".filtro.activo")?.classList.remove("activo");
        boton.classList.add("activo");
        mostrarProductos(categoriaActual, buscador.value);
    });
});

buscador.addEventListener("input", () => {
    mostrarProductos(categoriaActual, buscador.value);
});

// Evento de Ordenamiento
selectOrden.addEventListener("change", () => {
    mostrarProductos(categoriaActual, buscador.value);
});

// Cambios de Vista (Cuadrícula / Lista)
btnVistaGrid.addEventListener("click", () => {
    contenedor.classList.remove("vista-lista");
    btnVistaGrid.classList.add("activo");
    btnVistaList.classList.remove("activo");
});

btnVistaList.addEventListener("click", () => {
    contenedor.classList.add("vista-lista");
    btnVistaList.classList.add("activo");
    btnVistaGrid.classList.remove("activo");
});