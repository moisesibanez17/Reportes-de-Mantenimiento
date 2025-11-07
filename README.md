# Formulario CUCEI

Una página estática que actúa como formulario para reportes (quejas, sugerencias y opiniones) del plantel CUCEI. La versión actual envía los datos a un Google Apps Script (Google Sheets + Drive) si configuras la URL del WebApp; también permite pruebas locales.

## Contenido principal

- `index.html` — Interfaz del formulario (header con logos, campos solicitados, vista previa de evidencia).
- `styles.css` — Estilos: tema amarillo, responsive y reglas de disposición.
- `scripts.js` — Lógica del formulario: validación, preview de imagen, construcción del payload y envío al WebApp (const `WEBAPP_URL`).
- `assets/` — Logos e imágenes usadas por la interfaz.

## Estado actual

- El formulario acepta: `correo` (opcional), `area`, `ubicacion`, `categoria` (incluye "Otro"), `descripcion`, `impact` (checkboxes; opción "Ninguna" exclusiva), `evidence` (imagen ≤ 10 MB) y `urgencia` (radio). No se utiliza `nombre`.
- Para que los envíos lleguen a Google Sheets debes desplegar el Apps Script (web app) y pegar la URL en `scripts.js` (const `WEBAPP_URL`).

## Cómo ejecutar y probar localmente

1) Servir los archivos estáticos (recomendado). Desde la carpeta del proyecto puedes usar Python o un servidor npm:

```powershell
# Con Python (PowerShell)
python -m http.server 8000
# Abrir: http://localhost:8000

# Con npm (si tienes node)
npx http-server -p 8000
```

2) Abrir la página en el navegador y completar el formulario.

3) Configurar `WEBAPP_URL` en `scripts.js` con la URL de tu Google Apps Script (ver sección siguiente). Sin una URL válida la página no podrá enviar los datos al servidor.

## Despliegue de Google Apps Script (guardar en Sheets + Drive)

1. Crea un proyecto en https://script.google.com/ y pega el código proporcionado (función `doPost` que guarda la imagen en Drive y añade una fila en la hoja).
2. Edita las constantes del script: `SHEET_ID`, `SHEET_NAME` y opcionalmente `FOLDER_ID`.
3. Deploy → New deployment → Tipo: Web app
   - Execute as: Me
   - Who has access: Anyone (even anonymous)
4. Copia la URL del Web app y pégala en `scripts.js` como `WEBAPP_URL`.

### Nota sobre CORS

Si obtienes errores CORS (`blocked by CORS policy` o falta de `Access-Control-Allow-Origin`) al enviar desde tu servidor local, opciones:

- Asegúrate de que el WebApp esté desplegado correctamente con "Anyone (even anonymous)".
- Usar un proxy local (Node/Express) que reenvíe la petición al WebApp y devuelva la respuesta con la cabecera CORS (útil en desarrollo).
- Para producción, usa un endpoint propio (Cloud Run / Cloud Functions) y configura CORS allí.

Resumen proxy local (desarrollo): ejecutar `proxy-server.js` y apuntar `WEBAPP_URL` a `http://localhost:3000/submit`.

## Payload enviado al WebApp

El cliente envía un JSON con las siguientes propiedades:

- `correo` — string (opcional)
- `area` — string
- `ubicacion` — string
- `categoria` — string
- `descripcion` — string
- `impact` — array[string]
- `urgencia` — string
- `created` — ISO timestamp
- `evidence` — objeto { `name`, `size`, `type`, `dataUrl` } (dataUrl = imagen en base64). Puede ser null si no hay imagen.

## Problemas conocidos / troubleshooting

- Mensajes con `content_script.js` en consola: provienen de extensiones del navegador (autocompletado o gestores). Abre una ventana incógnita sin extensiones para confirmar.
- `Failed to fetch` o `blocked by CORS policy`: revisa `WEBAPP_URL`, despliegue del Apps Script y prueba la URL desde PowerShell con `Invoke-RestMethod` para confirmar que responde.

Ejemplo de prueba desde PowerShell:

```powershell
$body = @{ correo = 'test@example.com'; prueba = 'ping' } | ConvertTo-Json
Invoke-RestMethod -Uri 'TU_WEBAPP_URL_AQUI' -Method Post -Body $body -ContentType 'application/json'
```

Si PowerShell funciona pero el navegador no, es muy probable que sea un problema CORS.

## Cómo contribuir

1. Haz fork del repositorio.
2. Crea una rama `feature/tu-cambio`.
3. Abre un Pull Request con una descripción clara y screenshots si cambias la UI.

Buenas prácticas:

- Usa SVG para iconos cuando sea posible.
- Mantén estilos en `styles.css`.
- Valida datos tanto en cliente (`scripts.js`) como en servidor (Apps Script) si añades un backend.

## Estructura rápida

- `index.html` — formulario y hooks DOM
- `styles.css` — tema y responsive
- `scripts.js` — validación y envío
- `assets/` — logos y recursos

---
