/*=========================
  CATÁLOGO DINÁMICO
=========================*/

const contenedor = document.getElementById("lista-productos");

function mostrarProductos(categoria = "todos", texto = ""){

    contenedor.innerHTML = "";

    productos
    .filter(producto => {

        const coincideCategoria =
            categoria === "todos" ||
            producto.categoria.toLowerCase() === categoria;

        const coincideTexto =
            producto.nombre.toLowerCase().includes(texto.toLowerCase());

        return coincideCategoria && coincideTexto;

    })
    .forEach(producto=>{

        contenedor.innerHTML += `
            <article class="card-producto">

                <img src="${producto.imagen}" alt="${producto.nombre}">

                <div class="card-info">

                    <span class="categoria">${producto.categoria}</span>

                    <h3>${producto.nombre}</h3>

                    <p>${producto.descripcion}</p>

                    <a href="producto.html?id=${producto.id}" class="btn-producto">
                        Ver detalles
                    </a>

                </div>

            </article>
        `;

    });

}

mostrarProductos();

document.querySelectorAll(".filtro").forEach(boton=>{

    boton.addEventListener("click",()=>{

        document
        .querySelector(".filtro.activo")
        .classList.remove("activo");

        boton.classList.add("activo");

        mostrarProductos(boton.dataset.categoria);

    });

});

const buscador = document.getElementById("buscarProducto");

let categoriaActual = "todos";

buscador.addEventListener("input",()=>{

    mostrarProductos(categoriaActual,buscador.value);

});

document.querySelectorAll(".filtro").forEach(boton=>{

    boton.addEventListener("click",()=>{

        categoriaActual = boton.dataset.categoria;

        document
        .querySelector(".filtro.activo")
        .classList.remove("activo");

        boton.classList.add("activo");

        mostrarProductos(categoriaActual,buscador.value);

    });

});