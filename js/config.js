const CONFIG = {
  whatsapp: "51936235607",
  instagram: "https://www.instagram.com/oriza_art/",
  facebook: "https://www.facebook.com/oriza.art/",

  supabase: {
    url: "https://ltzfnsrxkkyuupwyykem.supabase.co",
    anonKey: "sb_publishable_u-VnItuSvVJ8UiyyFtMlLQ_kSqVYKdp"
  }
};

// URL Base de tu bucket de Supabase Storage para imágenes
const SUPABASE_STORAGE_URL = "https://ltzfnsrxkkyuupwyykem.supabase.co/storage/v1/object/public/productos";
const IMAGEN_DEFAULT_BUCKET = `${SUPABASE_STORAGE_URL}/no-image.webp`;

// Inicialización global del cliente de Supabase
const supabaseClient = window.supabase ? window.supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey) : null;

// Se expone explícitamente en window: una variable declarada con const/let
// en un script normal NO se agrega automáticamente a window, así que sin esta
// línea, otros archivos que chequean "window.supabaseClient" nunca lo detectan.
window.supabaseClient = supabaseClient;