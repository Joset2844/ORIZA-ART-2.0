/*=========================
  CATÁLOGO DINÁMICO
=========================*/

const contenedor = document.getElementById("lista-productos");

let productos = [];

function mostrarProductos(categoria = "todos", texto = ""){

    const filtrados = productos.filter(producto => {
        const coincideCategoria =
            categoria === "todos" ||
            producto.categoria.toLowerCase() === categoria;
        const coincideTexto =
            producto.nombre.toLowerCase().includes(texto.toLowerCase());
        return coincideCategoria && coincideTexto;
    });

    const fragment = document.createDocumentFragment();

    filtrados.forEach(producto=>{
        const article = document.createElement("article");
        article.className = "card-producto";
        article.innerHTML = `
            <img src="${producto.imagen}" alt="${producto.nombre}" loading="lazy">
            <div class="card-info">
                <span class="categoria">${producto.categoria}</span>
                <h3>${producto.nombre}</h3>
                <p>${producto.descripcion}</p>
                <a href="producto.html?id=${producto.id}" class="btn-producto">
                    Ver detalles
                </a>
            </div>
        `;
        fragment.appendChild(article);
    });

    contenedor.innerHTML = "";
    contenedor.appendChild(fragment);

}

async function iniciarCatalogo() {
    productos = await cargarProductos();
    mostrarProductos();
}

iniciarCatalogo();

const buscador = document.getElementById("buscarProducto");
let categoriaActual = "todos";

document.querySelectorAll(".filtro").forEach(boton=>{
    boton.addEventListener("click",()=>{
        categoriaActual = boton.dataset.categoria;
        document.querySelector(".filtro.activo")?.classList.remove("activo");
        boton.classList.add("activo");
        mostrarProductos(categoriaActual, buscador.value);
    });
});

buscador.addEventListener("input",()=>{
    mostrarProductos(categoriaActual,buscador.value);
});