/*
 * Design Promo – mapa 3D de Colombia en la sección de envíos. Sin dependencias, solo WebGL2.
 * Costa, relieve y poblados son reales (fuentes en DESIGN.md). Los datos viven en assets/mapa:
 *   colombia-relieve.png   R = altura, G = distancia al borde del país
 *   colombia-mapa.json     contorno para las paredes y luces de los poblados
 * Solo se carga cuando la sección se acerca y solo se anima mientras se ve.
 * Sin WebGL2 queda la imagen de respaldo (.is-respaldo en styles.css).
 */
(function () {
	'use strict';

	var mapa = document.querySelector('[data-map3d]');
	if (!mapa) { return; }

	var root = document.documentElement;
	var canvas = mapa.querySelector('canvas');
	var zona = mapa.parentNode;
	var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
	var pauseBtn = document.querySelector('[data-pause]');

	var BOGOTA = { n: 'Bogotá', lat: 4.71, lon: -74.07 };
	var CIUDADES = [
		{ n: 'Barranquilla', lat: 10.98, lon: -74.8, rotulo: 'der' },
		{ n: 'Medellín', lat: 6.25, lon: -75.56, rotulo: 'izq' },
		{ n: 'Cali', lat: 3.45, lon: -76.53, rotulo: 'izq' },
		{ n: 'Bucaramanga', lat: 7.12, lon: -73.12, rotulo: 'der' },
		{ n: 'Cúcuta', lat: 7.89, lon: -72.5 },
		{ n: 'Pasto', lat: 1.21, lon: -77.28, rotulo: 'izq' },
		{ n: 'Leticia', lat: -4.2, lon: -69.94, rotulo: 'der' },
		{ n: 'Puerto Carreño', lat: 6.19, lon: -67.48 },
		{ n: 'Riohacha', lat: 11.54, lon: -72.91 },
		{ n: 'San Andrés', lat: 12.55, lon: -81.7, rotulo: 'arriba' },
		{ n: 'Quibdó', lat: 5.69, lon: -76.66 },
		{ n: 'Mitú', lat: 1.25, lon: -70.23 },
	];

	// Escena: 2 unidades de norte a sur, unos 2.180 km. El relieve va exagerado para que se lea.
	var LARGO = 2;
	var ALTO = 0.2;
	var GROSOR = 0.075;
	var CENTRO = [0.545, 0.5];
	var CAMARA = { yaw: -0.2, pitch: 1.0, dist: 4.85, fov: 0.42, foco: [-0.15, -0.03, 0] };
	var ENTRADA_MS = 2800;

	var FUNCIONES = `
uniform sampler2D uMapa;
uniform mat4 uVista;
uniform vec4 uEscena;
uniform float uSube;
uniform float uAlto;
float altura(vec2 uv) { return pow(textureLod(uMapa, uv, 1.).r, 1.7) * uAlto * uSube; }
vec3 mundo(vec2 uv, float z) { return vec3((uv.x - uEscena.z) * uEscena.x, (uEscena.w - uv.y) * uEscena.y, z); }
`;
	var RUIDO = `
float ruido(vec2 p) {
	vec3 q = fract(vec3(p.xyx) * .1031);
	q += dot(q, q.yzx + 33.33);
	return fract((q.x + q.y) * q.z);
}
`;

	/* Tierra: superficie con relieve y paredes -------------------------------- */
	var VS_TIERRA = `#version 300 es
precision highp float;
layout(location=0) in vec2 aUv;
layout(location=1) in float aBase;
${FUNCIONES}
uniform float uGrosor;
out vec2 vUv;
out vec3 vPos;
out float vBase;
void main() {
	vPos = mundo(aUv, mix(altura(aUv), -uGrosor, aBase));
	vUv = aUv;
	vBase = aBase;
	gl_Position = uVista * vec4(vPos, 1.);
}`;

	var FS_TIERRA = `#version 300 es
precision highp float;
uniform sampler2D uMapa;
uniform vec3 uSol;
uniform float uSd;
in vec2 vUv;
in vec3 vPos;
out vec4 color;
${RUIDO}
void main() {
	vec4 t = texture(uMapa, vUv);
	float d = (t.a * 255. - 128.) / uSd;
	float aa = max(fwidth(d), .001);
	float a = smoothstep(-aa, aa, d + .4);
	if (a < .02) { discard; }

	vec2 xy = t.gb * 2. - 1.;
	vec3 n = normalize(vec3(xy, sqrt(max(0., 1. - dot(xy, xy)))));
	float difusa = dot(n, uSol);
	// Noroeste iluminado y sureste en penumbra, como la línea entre el día y la noche.
	float dia = smoothstep(-1.05, .95, dot(vPos.xy, vec2(-.8, .6)));
	float lum = clamp(.1 + .86 * difusa, 0., 1.);
	lum *= mix(.34, 1.18, dia);

	vec3 c = mix(vec3(.022, .13, .17), vec3(.05, .31, .28), smoothstep(.0, .36, lum));
	c = mix(c, vec3(.2, .72, .54), smoothstep(.3, .74, lum));
	// Las cumbres tiran a menta claro.
	c = mix(c, vec3(.6, .93, .8), smoothstep(.6, .92, t.r) * .55 * dia);

	// Filo de luz cian en la costa, el mismo que da el borde del planeta en la referencia.
	float filo = exp(-max(d, 0.) / 7.);
	c += vec3(.09, .5, .72) * filo * (.12 + .95 * dia);

	float grano = ruido(floor(vUv * vec2(1900., 2190.)));
	c *= .68 + .64 * grano;
	color = vec4(c * a, a);
}`;

	var FS_PARED = `#version 300 es
precision highp float;
uniform vec3 uSol;
in vec2 vUv;
in vec3 vPos;
in float vBase;
out vec4 color;
${RUIDO}
void main() {
	vec3 n = normalize(cross(dFdx(vPos), dFdy(vPos)));
	float luz = .55 + .45 * abs(dot(n, normalize(vec3(uSol.xy, .1))));
	float dia = smoothstep(-1.05, .95, dot(vPos.xy, vec2(-.8, .6)));
	vec3 c = mix(vec3(.1, .62, .66), vec3(.012, .07, .13), pow(vBase, .55));
	c *= luz * mix(.5, 1.15, dia);
	c *= .8 + .4 * ruido(floor(vUv * 2600.) + floor(vBase * 40.));
	color = vec4(c, 1.);
}`;

	/* Resplandor bajo el país -------------------------------------------------- */
	var VS_HALO = `#version 300 es
precision highp float;
layout(location=0) in vec2 aUv;
${FUNCIONES}
uniform float uGrosor;
out vec2 vUv;
void main() {
	vUv = aUv;
	gl_Position = uVista * vec4(mundo(aUv, -uGrosor), 1.);
}`;

	var FS_HALO = `#version 300 es
precision highp float;
uniform sampler2D uMapa;
uniform float uSd;
in vec2 vUv;
out vec4 color;
float dist(vec2 uv, float lod) { return (textureLod(uMapa, uv, lod).a * 255. - 128.) / uSd; }
void main() {
	float d = dist(vUv, 2.);
	float cerca = exp(min(d, 0.) / 8.);
	float lejos = max(0., exp(min(d + 2., 0.) / 18.) - .08);
	float marco = smoothstep(0., .035, min(min(vUv.x, 1. - vUv.x), min(vUv.y, 1. - vUv.y)));
	vec3 c = vec3(.03, .42, .5) * (cerca * .5 + lejos * .28);
	c *= marco;
	color = vec4(c, max(c.r, max(c.g, c.b)));
}`;

	/* Luces de los poblados ---------------------------------------------------- */
	var VS_LUCES = `#version 300 es
precision highp float;
layout(location=0) in vec3 aLuz;
${FUNCIONES}
uniform float uRevela;
uniform float uTiempo;
uniform float uPx;
uniform vec2 uOrigen;
out float vBrillo;
out float vPeso;
void main() {
	vec2 uv = aLuz.xy;
	float dist = distance(uv * vec2(1., 1.15), uOrigen * vec2(1., 1.15));
	float llega = smoothstep(dist - .12, dist, uRevela * .78);
	float destello = .82 + .18 * sin(uTiempo * 1.4 + uv.x * 311. + uv.y * 173.);
	vPeso = aLuz.z;
	vBrillo = llega * destello;
	gl_Position = uVista * vec4(mundo(uv, altura(uv) + .004), 1.);
	gl_PointSize = (6.5 + aLuz.z * aLuz.z * .2 + aLuz.z * 1.1) * uPx * (.4 + .6 * llega);
}`;

	var FS_LUCES = `#version 300 es
precision highp float;
in float vBrillo;
in float vPeso;
out vec4 color;
void main() {
	vec2 p = gl_PointCoord * 2. - 1.;
	float r2 = dot(p, p);
	if (r2 > 1.) { discard; }
	float nucleo = exp(-r2 * 30.);
	float halo = exp(-r2 * 4.2) * (1. - r2);
	vec3 c = vec3(1., .95, .78) * nucleo * 1.6 + vec3(1., .6, .16) * halo * (.5 + vPeso * .03);
	c *= vBrillo;
	color = vec4(c, max(c.r, max(c.g, c.b)));
}`;

	/* Arcos de envío con un cometa que viaja desde Bogotá ---------------------- */
	var VS_ARCO = `#version 300 es
precision highp float;
layout(location=0) in vec2 aT;
layout(location=1) in vec4 iRuta;
layout(location=2) in vec3 iDatos;
${FUNCIONES}
uniform vec2 uPantalla;
uniform float uAncho;
out float vT;
out float vLado;
flat out vec2 vCometa;
vec3 punto(float t, vec3 a, vec3 b) {
	vec3 p = mix(a, b, t);
	p.z += iDatos.z * 4. * t * (1. - t) * uSube;
	return p;
}
void main() {
	vec3 a = mundo(iRuta.xy, altura(iRuta.xy));
	vec3 b = mundo(iRuta.zw, altura(iRuta.zw));
	vec4 c = uVista * vec4(punto(aT.x, a, b), 1.);
	vec4 s = uVista * vec4(punto(aT.x + .01, a, b), 1.);
	vec2 dir = normalize((s.xy / s.w - c.xy / c.w) * uPantalla);
	c.xy += vec2(-dir.y, dir.x) * aT.y * uAncho / uPantalla * 2. * c.w;
	vT = aT.x;
	vLado = aT.y;
	vCometa = iDatos.xy;
	gl_Position = c;
}`;

	var FS_ARCO = `#version 300 es
precision highp float;
uniform float uTiempo;
uniform float uArco;
in float vT;
in float vLado;
flat in vec2 vCometa;
out vec4 color;
void main() {
	float s = abs(vLado);
	float nucleo = exp(-s * s * 120.);
	float halo = exp(-s * s * 11.) * (1. - s);
	if (vT > uArco) { discard; }

	float cabeza = fract(uTiempo * vCometa.y + vCometa.x) * 1.45;
	float atras = cabeza - vT;
	float cometa = atras > 0. ? exp(-atras * 2.6) * smoothstep(0., .04, atras) : 0.;
	cometa *= smoothstep(.0, .05, vT);

	vec3 c = vec3(.72, .95, 1.) * nucleo * .3;
	c += vec3(1.) * nucleo * cometa * 2.2;
	c += vec3(.5, .88, 1.) * halo * cometa * .85;
	c *= smoothstep(.0, .02, 1. - vT + .02);
	color = vec4(c, max(c.r, max(c.g, c.b)));
}`;

	/* Ondas que salen de Bogotá ------------------------------------------------ */
	var VS_ONDA = `#version 300 es
precision highp float;
layout(location=0) in vec2 aEsq;
${FUNCIONES}
uniform vec2 uOrigen;
uniform float uRadio;
out vec2 vEsq;
void main() {
	vEsq = aEsq;
	vec3 c = mundo(uOrigen, altura(uOrigen) + .006);
	gl_Position = uVista * vec4(c + vec3(aEsq * uRadio, 0.), 1.);
}`;

	var FS_ONDA = `#version 300 es
precision highp float;
uniform float uTiempo;
uniform float uFuerza;
in vec2 vEsq;
out vec4 color;
void main() {
	float r = length(vEsq);
	float i = 0.;
	for (int k = 0; k < 3; k++) {
		float f = fract(uTiempo * .34 + float(k) / 3.);
		i += (1. - smoothstep(0., .022, abs(r - f))) * (1. - f) * (1. - f);
	}
	vec3 c = vec3(1., .8, .36) * i * uFuerza * (1. - smoothstep(.9, 1., r));
	color = vec4(c, max(c.r, max(c.g, c.b)));
}`;

	/* Álgebra mínima ------------------------------------------------------------ */
	function resta(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
	function punto3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
	function cruz(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
	function unitario(a) { var l = Math.sqrt(punto3(a, a)); return [a[0] / l, a[1] / l, a[2] / l]; }

	function perspectiva(fov, asp, cerca, lejos) {
		var t = 1 / Math.tan(fov / 2);
		return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (lejos + cerca) / (cerca - lejos), -1, 0, 0, 2 * lejos * cerca / (cerca - lejos), 0];
	}

	function mirar(ojo, foco) {
		var z = unitario(resta(ojo, foco));
		var x = unitario(cruz([0, 0, 1], z));
		var y = cruz(z, x);
		return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -punto3(x, ojo), -punto3(y, ojo), -punto3(z, ojo), 1];
	}

	function multiplica(a, b) {
		var o = new Float32Array(16);
		for (var c = 0; c < 4; c++) {
			for (var f = 0; f < 4; f++) {
				o[c * 4 + f] = a[f] * b[c * 4] + a[f + 4] * b[c * 4 + 1] + a[f + 8] * b[c * 4 + 2] + a[f + 12] * b[c * 4 + 3];
			}
		}
		return o;
	}

	function limite(v) { return Math.max(0, Math.min(1, v)); }
	function suave(v) { return v * v * (3 - 2 * v); }
	function salida(v) { return 1 - Math.pow(1 - v, 3); }

	/* WebGL ---------------------------------------------------------------------- */
	var gl = null;
	var prog = {};
	var malla = {};
	var datos = null;
	var relieve = null;
	var relieveW = 0;
	var relieveH = 0;
	var escena = [0, 0, CENTRO[0], CENTRO[1]];
	var origen = [0, 0];
	var rotulos = [];
	var W = 0;
	var H = 0;
	var calidad = 1;

	function compilar(tipo, fuente) {
		var s = gl.createShader(tipo);
		gl.shaderSource(s, fuente);
		gl.compileShader(s);
		if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { throw new Error(gl.getShaderInfoLog(s)); }
		return s;
	}

	function programa(vs, fs) {
		var p = gl.createProgram();
		gl.attachShader(p, compilar(gl.VERTEX_SHADER, vs));
		gl.attachShader(p, compilar(gl.FRAGMENT_SHADER, fs));
		gl.linkProgram(p);
		if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { throw new Error(gl.getProgramInfoLog(p)); }
		var u = {};
		for (var i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) {
			var nombre = gl.getActiveUniform(p, i).name;
			u[nombre] = gl.getUniformLocation(p, nombre);
		}
		return { p: p, u: u };
	}

	function buffer(datosBuf, tipo) {
		var b = gl.createBuffer();
		gl.bindBuffer(tipo || gl.ARRAY_BUFFER, b);
		gl.bufferData(tipo || gl.ARRAY_BUFFER, datosBuf, gl.STATIC_DRAW);
		return b;
	}

	function atributo(loc, tam, paso, desde, divisor) {
		gl.enableVertexAttribArray(loc);
		gl.vertexAttribPointer(loc, tam, gl.FLOAT, false, paso, desde);
		if (divisor) { gl.vertexAttribDivisor(loc, divisor); }
	}

	function aUv(lat, lon) {
		return [(lon - datos.lon[0]) / (datos.lon[1] - datos.lon[0]), (lat - datos.lat[0]) / (datos.lat[1] - datos.lat[0])];
	}

	// La imagen trae altura y distancia al borde; aquí se calculan las normales del relieve.
	function armarTextura(img) {
		var w = relieveW = img.naturalWidth;
		var h = relieveH = img.naturalHeight;
		var lienzo = document.createElement('canvas');
		lienzo.width = w;
		lienzo.height = h;
		var ctx = lienzo.getContext('2d', { willReadFrequently: true });
		ctx.drawImage(img, 0, 0);
		var px = ctx.getImageData(0, 0, w, h).data;

		var n = w * h;
		var alt = new Float32Array(n);
		var i;
		relieve = new Uint8Array(n);
		for (i = 0; i < n; i++) {
			relieve[i] = px[i * 4];
			alt[i] = px[i * 4] / 255 * px[i * 4] / 255;
		}

		var tex = new Uint8Array(n * 4);
		var RELIEVE = 22;
		for (var y = 0; y < h; y++) {
			var yn = Math.max(0, y - 1) * w;
			var ys = Math.min(h - 1, y + 1) * w;
			for (var x = 0; x < w; x++) {
				var xo = Math.max(0, x - 1);
				var xe = Math.min(w - 1, x + 1);
				var dx = (alt[y * w + xe] - alt[y * w + xo]) * 2 + alt[yn + xe] - alt[yn + xo] + alt[ys + xe] - alt[ys + xo];
				var dy = (alt[ys + x] - alt[yn + x]) * 2 + alt[ys + xo] - alt[yn + xo] + alt[ys + xe] - alt[yn + xe];
				var nx = -dx * RELIEVE / 4;
				var ny = dy * RELIEVE / 4;
				var l = Math.sqrt(nx * nx + ny * ny + 1);
				i = (y * w + x) * 4;
				tex[i] = px[i];
				tex[i + 1] = (nx / l * 0.5 + 0.5) * 255;
				tex[i + 2] = (ny / l * 0.5 + 0.5) * 255;
				tex[i + 3] = px[i + 1];
			}
		}

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, tex);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		var aniso = gl.getExtension('EXT_texture_filter_anisotropic');
		if (aniso) { gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 4); }

		escena[1] = LARGO;
		escena[0] = LARGO * (datos.lon[1] - datos.lon[0]) / (datos.lat[0] - datos.lat[1]);
		return px;
	}

	// Rejilla que solo cubre las celdas que tocan el país.
	function armarSuperficie(px) {
		var paso = W < 480 ? 4 : 3;
		var cols = Math.floor((relieveW - 1) / paso) + 1;
		var filas = Math.floor((relieveH - 1) / paso) + 1;
		var verts = new Float32Array(cols * filas * 3);
		var indices = [];
		var f;
		var c;
		var borde = 124;

		for (f = 0; f < filas; f++) {
			for (c = 0; c < cols; c++) {
				var k = (f * cols + c) * 3;
				verts[k] = (c * paso + 0.5) / relieveW;
				verts[k + 1] = (f * paso + 0.5) / relieveH;
			}
		}
		function dentro(cc, ff) { return px[(ff * paso * relieveW + cc * paso) * 4 + 1] > borde; }
		for (f = 0; f < filas - 1; f++) {
			for (c = 0; c < cols - 1; c++) {
				if (dentro(c, f) || dentro(c + 1, f) || dentro(c, f + 1) || dentro(c + 1, f + 1)) {
					var a = f * cols + c;
					indices.push(a, a + cols, a + 1, a + 1, a + cols, a + cols + 1);
				}
			}
		}

		malla.tierra = gl.createVertexArray();
		gl.bindVertexArray(malla.tierra);
		buffer(verts);
		atributo(0, 2, 12, 0);
		atributo(1, 1, 12, 8);
		buffer(new Uint32Array(indices), gl.ELEMENT_ARRAY_BUFFER);
		malla.nTierra = indices.length;
	}

	function armarParedes() {
		var total = datos.contorno.reduce(function (s, r) { return s + r.length / 2 + 1; }, 0);
		var verts = new Float32Array(total * 6);
		var inicios = [];
		var k = 0;
		datos.contorno.forEach(function (r) {
			inicios.push([k / 3, (r.length / 2 + 1) * 2]);
			for (var i = 0; i <= r.length / 2; i++) {
				var j = i * 2 % r.length;
				var u = r[j] / 1e5;
				var v = r[j + 1] / 1e5;
				verts[k++] = u; verts[k++] = v; verts[k++] = 0;
				verts[k++] = u; verts[k++] = v; verts[k++] = 1;
			}
		});
		malla.paredes = gl.createVertexArray();
		gl.bindVertexArray(malla.paredes);
		buffer(verts);
		atributo(0, 2, 12, 0);
		atributo(1, 1, 12, 8);
		malla.nParedes = inicios;
	}

	function armarLuces() {
		var base = datos.luces;
		var nBase = base.length / 3;
		var lista = new Float32Array((nBase + CIUDADES.length + 1) * 3);
		for (var i = 0; i < nBase; i++) {
			lista[i * 3] = base[i * 3] / 1e4;
			lista[i * 3 + 1] = base[i * 3 + 1] / 1e4;
			lista[i * 3 + 2] = base[i * 3 + 2];
		}
		var k = nBase * 3;
		CIUDADES.forEach(function (c) {
			var uv = aUv(c.lat, c.lon);
			lista[k++] = uv[0]; lista[k++] = uv[1]; lista[k++] = 9;
		});
		lista[k++] = origen[0]; lista[k++] = origen[1]; lista[k++] = 13;
		malla.luces = gl.createVertexArray();
		gl.bindVertexArray(malla.luces);
		buffer(lista);
		atributo(0, 3, 12, 0);
		malla.nLuces = lista.length / 3;
	}

	function armarArcos() {
		var TRAMOS = 80;
		var cinta = new Float32Array((TRAMOS + 1) * 4);
		for (var i = 0; i <= TRAMOS; i++) {
			cinta.set([i / TRAMOS, -1, i / TRAMOS, 1], i * 4);
		}
		var rutas = new Float32Array(CIUDADES.length * 7);
		CIUDADES.forEach(function (c, n) {
			var uv = aUv(c.lat, c.lon);
			var largo = Math.hypot((uv[0] - origen[0]) * escena[0], (uv[1] - origen[1]) * escena[1]);
			rutas.set([origen[0], origen[1], uv[0], uv[1], n * 0.137 + (n % 3) * 0.21, 0.13 + (n % 4) * 0.018, 0.05 + largo * 0.36], n * 7);
		});
		malla.arcos = gl.createVertexArray();
		gl.bindVertexArray(malla.arcos);
		buffer(cinta);
		atributo(0, 2, 8, 0);
		buffer(rutas);
		atributo(1, 4, 28, 0, 1);
		atributo(2, 3, 28, 16, 1);
		malla.nCinta = (TRAMOS + 1) * 2;
		malla.nArcos = CIUDADES.length;
	}

	function armarPlanos() {
		malla.halo = gl.createVertexArray();
		gl.bindVertexArray(malla.halo);
		buffer(new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]));
		atributo(0, 2, 8, 0);
		malla.onda = gl.createVertexArray();
		gl.bindVertexArray(malla.onda);
		buffer(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
		atributo(0, 2, 8, 0);
	}

	function armarRotulos() {
		CIUDADES.concat([BOGOTA]).forEach(function (c) {
			if (!c.rotulo && c !== BOGOTA) { return; }
			var el = document.createElement('span');
			el.className = 'ship__label' + (c === BOGOTA ? ' ship__label--origen' : '');
			el.textContent = c.n;
			mapa.appendChild(el);
			rotulos.push({ el: el, uv: aUv(c.lat, c.lon), lado: c === BOGOTA ? 'der' : c.rotulo });
		});
	}

	/* Cuadro --------------------------------------------------------------------- */
	var vista = null;
	var SOL = unitario([-0.62, 0.58, 0.53]);

	function usar(p) {
		gl.useProgram(p.p);
		gl.uniformMatrix4fv(p.u.uVista, false, vista.m);
		if (p.u.uEscena) { gl.uniform4fv(p.u.uEscena, escena); }
		if (p.u.uSube) { gl.uniform1f(p.u.uSube, vista.sube); }
		if (p.u.uAlto) { gl.uniform1f(p.u.uAlto, ALTO); }
		if (p.u.uGrosor) { gl.uniform1f(p.u.uGrosor, GROSOR); }
		if (p.u.uSd) { gl.uniform1f(p.u.uSd, datos.sd); }
		if (p.u.uSol) { gl.uniform3fv(p.u.uSol, SOL); }
		if (p.u.uOrigen) { gl.uniform2fv(p.u.uOrigen, origen); }
		if (p.u.uTiempo) { gl.uniform1f(p.u.uTiempo, vista.reloj); }
	}

	function calcularVista(e, reloj) {
		var sube = salida(limite(e * 1.5));
		var giro = suave(limite(e * 1.25));
		var mecer = reduce.matches ? 0 : Math.sin(reloj * 0.22) * 0.07;
		var yaw = CAMARA.yaw * giro + mecer + puntero.x * 0.1;
		var pitch = 1.42 + (CAMARA.pitch - 1.42) * giro + (reduce.matches ? 0 : Math.sin(reloj * 0.17) * 0.015) - puntero.y * 0.05;
		var r = CAMARA.dist * Math.cos(pitch);
		var foco = CAMARA.foco;
		var ojo = [foco[0] + Math.sin(yaw) * r, foco[1] - Math.cos(yaw) * r, CAMARA.dist * Math.sin(pitch)];
		vista = {
			m: multiplica(perspectiva(CAMARA.fov, W / H, 0.1, 30), mirar(ojo, CAMARA.foco)),
			sube: sube,
			reloj: reloj,
			luces: limite((e - 0.08) / 0.62),
			arco: suave(limite((e - 0.4) / 0.6)) * 1.02,
		};
	}

	function dibujar() {
		var px = canvas.width / W;
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

		gl.disable(gl.DEPTH_TEST);
		usar(prog.halo);
		gl.bindVertexArray(malla.halo);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		gl.enable(gl.DEPTH_TEST);
		usar(prog.pared);
		gl.bindVertexArray(malla.paredes);
		malla.nParedes.forEach(function (r) { gl.drawArrays(gl.TRIANGLE_STRIP, r[0], r[1]); });

		usar(prog.tierra);
		gl.bindVertexArray(malla.tierra);
		gl.drawElements(gl.TRIANGLES, malla.nTierra, gl.UNSIGNED_INT, 0);

		gl.disable(gl.DEPTH_TEST);
		usar(prog.onda);
		gl.uniform1f(prog.onda.u.uRadio, 0.3);
		gl.uniform1f(prog.onda.u.uFuerza, vista.luces * 1.4);
		gl.bindVertexArray(malla.onda);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		usar(prog.luces);
		gl.uniform1f(prog.luces.u.uRevela, vista.luces);
		gl.uniform1f(prog.luces.u.uPx, px * Math.max(0.75, W / 560));
		gl.bindVertexArray(malla.luces);
		gl.drawArrays(gl.POINTS, 0, malla.nLuces);

		usar(prog.arco);
		gl.uniform1f(prog.arco.u.uArco, vista.arco);
		gl.uniform2f(prog.arco.u.uPantalla, canvas.width, canvas.height);
		gl.uniform1f(prog.arco.u.uAncho, 11 * px);
		gl.bindVertexArray(malla.arcos);
		gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, malla.nCinta, malla.nArcos);

		gl.bindVertexArray(null);
		moverRotulos();
	}

	var AJUSTES = {
		izq: 'translate(calc(-100% - 9px), -50%)',
		der: 'translate(9px, -50%)',
		arriba: 'translate(-50%, calc(-100% - 8px))',
	};

	function moverRotulos() {
		var m = vista.m;
		rotulos.forEach(function (r) {
			var tx = Math.min(relieveW - 1, Math.round(r.uv[0] * relieveW));
			var ty = Math.min(relieveH - 1, Math.round(r.uv[1] * relieveH));
			var z = Math.pow(relieve[ty * relieveW + tx] / 255, 1.7) * ALTO * vista.sube;
			var x = (r.uv[0] - escena[2]) * escena[0];
			var y = (escena[3] - r.uv[1]) * escena[1];
			var w = m[3] * x + m[7] * y + m[11] * z + m[15];
			var sx = ((m[0] * x + m[4] * y + m[8] * z + m[12]) / w + 1) / 2 * W;
			var sy = (1 - (m[1] * x + m[5] * y + m[9] * z + m[13]) / w) / 2 * H;
			var ajuste = AJUSTES[r.lado];
			r.el.style.transform = 'translate3d(' + sx.toFixed(1) + 'px, ' + sy.toFixed(1) + 'px, 0) ' + ajuste;
		});
	}

	/* Animación ------------------------------------------------------------------ */
	var puntero = { x: 0, y: 0, ax: 0, ay: 0 };
	var raf = null;
	var visible = false;
	var entrada = reduce.matches ? 1 : 0;
	var reloj = 2.2;
	var previo = 0;
	var lentos = 0;
	var cuadros = 0;

	function ajustarCalidad(dt) {
		if (++cuadros > 90 || calidad < 0.6) { return; }
		if (dt > 34) { lentos++; }
		if (cuadros === 90 && lentos > 45) {
			calidad *= 0.75;
			cuadros = 0;
			lentos = 0;
			medir();
		}
	}

	function bucle(t) {
		raf = null;
		var dt = Math.min(t - previo, 100);
		previo = t;
		reloj += dt / 1000;
		entrada = limite(entrada + dt / ENTRADA_MS);
		puntero.x += (puntero.ax - puntero.x) * 0.05;
		puntero.y += (puntero.ay - puntero.y) * 0.05;
		if (entrada >= 1) { mapa.classList.add('is-listo'); }
		calcularVista(entrada, reloj);
		dibujar();
		ajustarCalidad(dt);
		if (visible && !root.classList.contains('is-paused')) { raf = requestAnimationFrame(bucle); }
	}

	// Con las animaciones pausadas o reducidas el mapa queda completo y quieto.
	function quieto() {
		entrada = 1;
		mapa.classList.add('is-listo');
		calcularVista(entrada, reloj);
		dibujar();
	}

	function reproducir() {
		if (!gl || !vista || raf || !visible) { return; }
		if (reduce.matches || root.classList.contains('is-paused')) {
			quieto();
			return;
		}
		previo = performance.now();
		raf = requestAnimationFrame(bucle);
	}

	function medir() {
		var caja = mapa.getBoundingClientRect();
		if (!gl || !caja.width) { return; }
		W = caja.width;
		H = caja.height;
		// Con pantallas de densidad 1 se dibuja de más para que los bordes queden limpios.
		var densidad = Math.min(2, Math.max(window.devicePixelRatio || 1, 1.5)) * calidad;
		canvas.width = Math.round(W * densidad);
		canvas.height = Math.round(H * densidad);
		gl.viewport(0, 0, canvas.width, canvas.height);
		calcularVista(entrada, reloj);
		dibujar();
	}

	function respaldo() {
		mapa.classList.remove('is-ready');
		mapa.classList.add('is-respaldo');
	}

	function cargarImagen(src) {
		return new Promise(function (ok, mal) {
			var img = new Image();
			img.onload = function () { ok(img); };
			img.onerror = mal;
			img.src = src;
		});
	}

	function armar(img, json) {
		datos = json;
		var caja = mapa.getBoundingClientRect();
		W = caja.width;
		origen = aUv(BOGOTA.lat, BOGOTA.lon);

		var px = armarTextura(img);
		prog.tierra = programa(VS_TIERRA, FS_TIERRA);
		prog.pared = programa(VS_TIERRA, FS_PARED);
		prog.halo = programa(VS_HALO, FS_HALO);
		prog.luces = programa(VS_LUCES, FS_LUCES);
		prog.arco = programa(VS_ARCO, FS_ARCO);
		prog.onda = programa(VS_ONDA, FS_ONDA);

		armarSuperficie(px);
		armarParedes();
		armarLuces();
		armarArcos();
		armarPlanos();
		armarRotulos();
		medir();

		mapa.classList.add('is-ready');
		reproducir();

		if ('ResizeObserver' in window) { new ResizeObserver(medir).observe(mapa); }
		else { window.addEventListener('resize', medir); }
	}

	function iniciar() {
		gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true });
		if (!gl) { respaldo(); return; }

		canvas.addEventListener('webglcontextlost', function () {
			gl = null;
			if (raf) { cancelAnimationFrame(raf); raf = null; }
			respaldo();
		});

		Promise.all([
			cargarImagen('assets/mapa/colombia-relieve.png'),
			fetch('assets/mapa/colombia-mapa.json').then(function (r) {
				if (!r.ok) { throw new Error('Sin datos del mapa'); }
				return r.json();
			}),
		]).then(function (r) { armar(r[0], r[1]); }).catch(respaldo);
	}

	if ('IntersectionObserver' in window) {
		var carga = new IntersectionObserver(function (entries) {
			if (entries[0].isIntersecting) {
				carga.disconnect();
				iniciar();
			}
		}, { rootMargin: '700px 0px' });
		carga.observe(mapa);

		// La entrada arranca cuando ya se ve buena parte del mapa, no apenas asoma.
		new IntersectionObserver(function (entries) {
			visible = entries[0].isIntersecting;
			reproducir();
		}, { threshold: 0.3 }).observe(mapa);
	} else {
		visible = true;
		iniciar();
	}

	if (pauseBtn) { pauseBtn.addEventListener('click', reproducir); }

	if (window.matchMedia('(hover: hover)').matches) {
		zona.addEventListener('pointermove', function (e) {
			var caja = zona.getBoundingClientRect();
			puntero.ax = (e.clientX - caja.left) / caja.width * 2 - 1;
			puntero.ay = (e.clientY - caja.top) / caja.height * 2 - 1;
		}, { passive: true });
		zona.addEventListener('pointerleave', function () {
			puntero.ax = 0;
			puntero.ay = 0;
		});
	}
})();
