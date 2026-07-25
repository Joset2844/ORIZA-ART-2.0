async function cargarProductos() {

const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEETS.ID}/gviz/tq?sheet=${CONFIG.SHEETS.SHEET}&tqx=out:json`;

    const res = await fetch(url);
    const txt = await res.text();

    const json = JSON.parse(txt.substring(47).slice(0,-2));

    return json.table.rows
        .filter(r => r.c[8]?.v?.toString().toLowerCase() === "activo")
        .sort((a, b) => (Number(a.c[10]?.v || 999) - Number(b.c[10]?.v || 999)))
        .map((r, idx) => {

            const stockRaw = r.c[11]?.v;
            const stock = (stockRaw === undefined || stockRaw === "") ? 999 : Number(stockRaw);

            return {

                id: idx + 1,

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

                destacado:
                    (r.c[9]?.v || "")
                    .toString()
                    .toLowerCase()==="si",

                orden: Number(r.c[10]?.v || 999),

                stock: stock,

                agotado: stock <= 0

            };

        });
}