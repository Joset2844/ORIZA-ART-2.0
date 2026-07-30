/*=========================
  CATÁLOGO DINÁMICO E INTERACTIVO
=========================*/

let productos = [];
let categoriaActual = "todos";

function escapeHTML(str = "") {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function mostrarProductos(categoria = "todos", texto = "") {
    const contenedor = document.getElementById("lista-productos");
    const selectOrden = document.getElementById("selectOrden");

    if (!contenedor) return;

    const catFiltro = categoria.toLowerCase().trim();
    const textoFiltro = (texto || "").toLowerCase().trim();

    // Filtrar productos
    let filtrados = productos.filter(producto => {
        let coincideCategoria = false;
        const catProd = (producto.categoria || "").toLowerCase().trim();

        if (catFiltro === "favoritos") {
            coincideCategoria = typeof esFavorito === "function" ? esFavorito(producto.id) : false;
        } else if (catFiltro === "todos") {
            coincideCategoria = true;
        } else {
            coincideCategoria = catProd.includes(catFiltro) || catFiltro.includes(catProd);
        }

        const coincideTexto = (producto.nombre || "").toLowerCase().includes(textoFiltro);
        return coincideCategoria && coincideTexto;
    });

    // Ordenar productos
    const criterioOrden = selectOrden ? selectOrden.value : "relevantes";
    filtrados.sort((a, b) => {
        if (criterioOrden === "precio-asc") return Number(a.precio) - Number(b.precio);
        if (criterioOrden === "precio-desc") return Number(b.precio) - Number(a.precio);
        if (a.agotado !== b.agotado) return a.agotado ? 1 : -1;
        if (a.destacado !== b.destacado) return b.destacado ? 1 : -1;
        return Number(a.id) - Number(b.id);
    });

    contenedor.innerHTML = "";

    if (filtrados.length === 0) {
        contenedor.innerHTML = `
            <div style="text-align:center; grid-column: 1/-1; padding: 40px 20px;">
                <p>${categoria === "favoritos" ? "Aún no has guardado productos favoritos. ❤️" : "No se encontraron productos."}</p>
            </div>
        `;
        return;
    }

    // Construir HTML con DocumentFragment para minimizar re-flows del DOM
    const fragment = document.createDocumentFragment();

    filtrados.forEach(producto => {
        const esFav = typeof esFavorito === "function" ? esFavorito(producto.id) : false;
        const article = document.createElement("article");
        article.className = "card-producto" + (producto.agotado ? " agotado" : "");
        
        const fallbackImg = typeof IMAGEN_DEFAULT_BUCKET !== "undefined" ? IMAGEN_DEFAULT_BUCKET : "";

        article.innerHTML = `
            <div class="card-imagen-wrap">
                <button 
                    type="button"
                    class="btn-favorito-card ${esFav ? "activo" : ""}" 
                    data-id="${producto.id}"
                    title="${esFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}"
                >
                    ${esFav ? '❤️' : '🤍'}
                </button>
                <img 
                    src="${escapeHTML(producto.imagen)}" 
                    alt="${escapeHTML(producto.nombre)}" 
                    loading="lazy"
                    decoding="async"
                    width="300"
                    height="300"
                    onerror="this.onerror=null; this.src='${fallbackImg}';"
                >
                ${producto.agotado
                    ? '<span class="badge-agotado">Agotado</span>'
                    : (producto.stock <= 3 ? `<span class="badge-stock">¡Últimas ${producto.stock}!</span>` : "")}
            </div>
            <div class="card-info">
                <span class="categoria">${escapeHTML(producto.categoria)}</span>
                <h3>${escapeHTML(producto.nombre)}</h3>
                <p>${escapeHTML(producto.descripcion)}</p>
                <span class="card-precio">S/ ${Number(producto.precio).toFixed(2)}</span>
                <div class="card-acciones">
                    <a href="producto.html?id=${producto.id}" class="btn-producto">
                        Ver detalles
                    </a>
                    <button 
                        type="button"
                        class="btn-compartir-card" 
                        data-nombre="${escapeHTML(producto.nombre)}"
                        data-desc="${escapeHTML(producto.descripcion)}"
                        data-id="${producto.id}"
                        title="Compartir producto"
                    >
                        🔗
                    </button>
                    <button
                        type="button"
                        class="btn-agregar-carrito"
                        data-id="${producto.id}"
                        data-nombre="${escapeHTML(producto.nombre)}"
                        data-precio="${producto.precio}"
                        data-imagen="${escapeHTML(producto.imagen)}"
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

    contenedor.appendChild(fragment);

    requestAnimationFrame(() => {
        contenedor.classList.add("cargado");
    });
}

// Carga Inicial del Catálogo
async function iniciarCatalogo() {
    sessionStorage.removeItem("oriza_productos_cache");
    if (typeof cargarProductos === "function") {
        productos = await cargarProductos();
    }
    const buscador = document.getElementById("buscarProducto");
    mostrarProductos(categoriaActual, buscador ? buscador.value : "");
}

// Escucha de Evento Global de Actualización del Carrito
window.addEventListener("cart:updated", () => {
    if (categoriaActual === "favoritos") {
        const buscador = document.getElementById("buscarProducto");
        mostrarProductos("favoritos", buscador ? buscador.value : "");
    }
});

// Asignación segura de eventos tras cargar el DOM
document.addEventListener("DOMContentLoaded", () => {
    iniciarCatalogo();

    const contenedor = document.getElementById("lista-productos");
    const buscador = document.getElementById("buscarProducto");
    const selectOrden = document.getElementById("selectOrden");
    const btnVistaGrid = document.getElementById("btnVistaGrid");
    const btnVistaList = document.getElementById("btnVistaList");

    if (contenedor) {
        contenedor.addEventListener("click", (e) => {
            const btnFav = e.target.closest(".btn-favorito-card");
            if (btnFav) {
                e.stopPropagation();
                const id = btnFav.dataset.id;
                
                if (typeof toggleFavorito === "function") {
                    const ahoraEsFav = toggleFavorito(id);
                    btnFav.classList.toggle("activo", ahoraEsFav);
                    btnFav.innerHTML = ahoraEsFav ? '❤️' : '🤍';
                    btnFav.title = ahoraEsFav ? 'Quitar de favoritos' : 'Agregar a favoritos';

                    if (categoriaActual === "favoritos") {
                        mostrarProductos("favoritos", buscador ? buscador.value : "");
                    }
                }
                return;
            }

            const btnShare = e.target.closest(".btn-compartir-card");
            if (btnShare) {
                e.stopPropagation();
                const { id, nombre, desc } = btnShare.dataset;
                const urlProducto = `${window.location.origin}${window.location.pathname.replace("catalogo.html", "")}producto.html?id=${id}`;

                if (typeof compartirProducto === "function") {
                    compartirProducto(nombre, desc, urlProducto);
                } else {
                    console.error("❌ compartirProducto() no está disponible en global.js");
                }
            }
        });
    }

    // Filtros por Categoría
    document.querySelectorAll(".filtro").forEach(boton => {
        boton.addEventListener("click", () => {
            categoriaActual = boton.dataset.categoria;
            document.querySelector(".filtro.activo")?.classList.remove("activo");
            boton.classList.add("activo");
            mostrarProductos(categoriaActual, buscador ? buscador.value : "");
        });
    });

    if (buscador) {
        buscador.addEventListener("input", () => {
            mostrarProductos(categoriaActual, buscador.value);
        });
    }

    if (selectOrden) {
        selectOrden.addEventListener("change", () => {
            mostrarProductos(categoriaActual, buscador ? buscador.value : "");
        });
    }

    if (btnVistaGrid && btnVistaList && contenedor) {
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
    }
});