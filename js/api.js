async function cargarProductos() {

const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEETS.ID}/gviz/tq?sheet=${CONFIG.SHEETS.SHEET}&tqx=out:json`;

    const res = await fetch(url);
    const txt = await res.text();

    const json = JSON.parse(txt.substring(47).slice(0,-2));

    return json.table.rows.map(r=>({

        id: Number(r.c[0]?.v),
        codigo: r.c[1]?.v || "",

        categoria: r.c[2]?.v || "",

        nombre: r.c[3]?.v || "",

        precio: Number(r.c[4]?.v || 0),

        materiales: (r.c[5]?.v || "")
            .split(",")
            .map(x=>x.trim())
            .filter(Boolean),

        descripcion: r.c[6]?.v || "",

        imagen: `img/${r.c[1]?.v}.webp`,

        galeria: [
    r.c[7]?.v || "img/hero.jpg"
],

        disponible:
            (r.c[8]?.v || "")
            .toString()
            .toLowerCase()=="activo",

        destacado:
            (r.c[9]?.v || "")
            .toString()
            .toLowerCase()=="si",

        stock:999,

        nuevo:false,

        personalizable:true,

        colores:[]
    }));
}