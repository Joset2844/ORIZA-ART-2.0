# Configurar el Panel de Administración

El admin necesita un "backend" para poder escribir en tu Google Sheet
(una web estática sola no puede hacer eso). Usamos Google Apps Script:
es gratis, vive dentro de tu propio Sheet, y no requiere que mantengas
ningún servidor.

## 1. Crear el backend

1. Abre tu Google Sheet de productos.
2. Ve a **Extensiones > Apps Script**.
3. Borra el código de ejemplo y pega todo el contenido de `apps-script/Code.gs`.
4. En la línea `const CLAVE_ADMIN = "CAMBIA_ESTA_CLAVE";` reemplaza el texto
   por la contraseña que quieras usar para entrar al panel.
5. Guarda (ícono de disquete o Ctrl+S).

## 2. Publicarlo como Web App

1. Arriba a la derecha, click en **Implementar > Nueva implementación**.
2. En "Selecciona el tipo", click en el ícono de engranaje y elige **Aplicación web**.
3. Configura:
   - **Ejecutar como:** Yo (tu cuenta)
   - **Quién tiene acceso:** Cualquier usuario
4. Click en **Implementar**.
5. Google te pedirá autorizar permisos la primera vez — acepta (es tu propio script).
6. Copia la **URL de la aplicación web** que te da (termina en `/exec`).

## 3. Conectar el panel

1. Abre `js/admin.js`.
2. En la primera línea de configuración:
   ```js
   const ADMIN_API_URL = "PEGA_AQUI_TU_URL_DE_APPS_SCRIPT";
   ```
   Reemplaza el texto por la URL que copiaste.
3. Sube los archivos actualizados a tu hosting (GitHub Pages).

## 4. Entrar al panel

Abre `tuweb.com/admin.html` y entra con la contraseña que pusiste en el paso 1.

## Notas importantes

- **La columna STOCK (12/L) debe existir en tu Sheet** para que el admin
  pueda editarla — si aún no la agregaste, hazlo antes de usar el panel.
- **Fotos de productos nuevos:** el panel no puede subir archivos a tu
  hosting directamente. Sube tu foto a un servicio gratuito como
  [imgbb.com](https://imgbb.com) o Google Drive (con acceso público) y
  pega el link en el campo "Imagen" del formulario. Si lo dejas vacío,
  se usa la convención `img/{ID}.webp` que ya usan tus productos actuales.
- **Si cambias la contraseña más adelante**, edita `CLAVE_ADMIN` en el
  Apps Script y vuelve a implementar (Implementar > Administrar
  implementaciones > editar > Nueva versión).
- `admin.html` no aparece en ningún menú del sitio y tiene
  `noindex` para que Google no lo indexe, pero la URL sigue siendo
  pública si alguien la adivina — la contraseña es tu única protección,
  así que usa una que no sea obvia.
