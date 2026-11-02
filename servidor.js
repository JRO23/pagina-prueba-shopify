/*
 * Servidor local del sitio de Design Promo. No necesita instalar nada más que Node.js.
 * Solo responde en este PC (127.0.0.1): nadie más en la red ni en internet puede verlo.
 *
 * Uso:  node servidor.js          inicia el sitio en http://localhost:8080
 *       node servidor.js --abrir  además lo abre en el navegador
 *       set PORT=3000 && node servidor.js   para usar otro puerto
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PUERTO = Number(process.env.PORT) || 8080;
const RAIZ = __dirname;
const URL_SITIO = 'http://localhost:' + PUERTO;

const TIPOS = {
	'.html': 'text/html; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.jpg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.json': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.woff2': 'font/woff2',
	'.mp4': 'video/mp4',
};

function responder(res, codigo, texto) {
	res.writeHead(codigo, { 'Content-Type': 'text/plain; charset=utf-8' });
	res.end(texto);
}

const servidor = http.createServer((req, res) => {
	let ruta;
	try {
		ruta = decodeURIComponent(new URL(req.url, URL_SITIO).pathname);
	} catch (e) {
		return responder(res, 400, 'Solicitud no válida');
	}

	const archivo = path.join(RAIZ, ruta.endsWith('/') ? ruta + 'index.html' : ruta);
	const tipo = TIPOS[path.extname(archivo).toLowerCase()];

	// Solo se sirve lo que está dentro de esta carpeta y es parte del sitio.
	if (!archivo.startsWith(RAIZ + path.sep) || !tipo || path.basename(archivo) === 'servidor.js') {
		return responder(res, 404, 'Página no encontrada');
	}

	fs.readFile(archivo, (err, datos) => {
		if (err) return responder(res, 404, 'Página no encontrada');
		res.writeHead(200, { 'Content-Type': tipo, 'Cache-Control': 'no-cache' });
		res.end(datos);
	});
});

function abrirNavegador() {
	if (process.argv.includes('--abrir')) exec('start "" "' + URL_SITIO + '"');
}

servidor.on('error', (err) => {
	if (err.code === 'EADDRINUSE') {
		console.log('El puerto ' + PUERTO + ' ya está en uso. Puede que el sitio ya esté abierto en ' + URL_SITIO);
		abrirNavegador();
		return;
	}
	throw err;
});

servidor.listen(PUERTO, '127.0.0.1', () => {
	console.log('Sitio de Design Promo funcionando en ' + URL_SITIO);
	console.log('Cierra esta ventana para apagarlo.');
	abrirNavegador();
});
