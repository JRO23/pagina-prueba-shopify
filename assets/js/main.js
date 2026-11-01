/*
 * Design Promo – comportamiento del sitio. Sin dependencias.
 * Cada bloque revisa si su sección existe, así el mismo archivo sirve para todas las páginas.
 */
(function () {
	'use strict';

	var root = document.documentElement;
	var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
	var WA = 'https://wa.me/573133955378?text=';

	var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
	var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

	// Centra un elemento dentro de su barra con scroll horizontal, sin mover la página.
	function centerInBar(el) {
		var bar = el.parentNode;
		var b = bar.getBoundingClientRect();
		var r = el.getBoundingClientRect();
		bar.scrollLeft += (r.left + r.width / 2) - (b.left + b.width / 2);
	}

	/* Cabecera: sólida al hacer scroll ------------------------------------- */
	var header = $('[data-header]');
	var navEl = $('[data-nav]');
	var menuToggle = $('[data-menu-toggle]');
	var hasHero = !!$('[data-hero]');

	function updateHeader() {
		var open = navEl && navEl.classList.contains('is-open');
		header.classList.toggle('is-solid', open || !hasHero || window.scrollY > 24 || $$('.nav__panel:not([hidden])').length > 0);
	}
	window.addEventListener('scroll', updateHeader, { passive: true });
	updateHeader();

	/* Menús desplegables: clic, teclado y hover ---------------------------- */
	var menuButtons = $$('.nav__link[aria-controls]');
	var closeTimer = null;
	var isDesktop = window.matchMedia('(min-width: 1025px) and (hover: hover)');

	function setMenu(btn, open) {
		btn.setAttribute('aria-expanded', open ? 'true' : 'false');
		$('#' + btn.getAttribute('aria-controls')).hidden = !open;
	}

	function closeMenus(except) {
		menuButtons.forEach(function (b) {
			if (b !== except) { setMenu(b, false); }
		});
		updateHeader();
	}

	menuButtons.forEach(function (btn) {
		var item = btn.parentNode;
		btn.addEventListener('click', function () {
			var willOpen = btn.getAttribute('aria-expanded') !== 'true';
			closeMenus(btn);
			setMenu(btn, willOpen);
			updateHeader();
		});
		item.addEventListener('mouseenter', function () {
			if (!isDesktop.matches) { return; }
			clearTimeout(closeTimer);
			closeMenus(btn);
			setMenu(btn, true);
			updateHeader();
		});
		item.addEventListener('mouseleave', function () {
			if (!isDesktop.matches) { return; }
			closeTimer = setTimeout(function () { closeMenus(); }, 160);
		});
		item.addEventListener('focusout', function (e) {
			if (isDesktop.matches && !item.contains(e.relatedTarget)) { setMenu(btn, false); updateHeader(); }
		});
	});

	document.addEventListener('keydown', function (e) {
		if (e.key !== 'Escape') { return; }
		var abierto = menuButtons.filter(function (b) { return b.getAttribute('aria-expanded') === 'true'; })[0];
		closeMenus();
		if (abierto) { abierto.focus(); }
	});

	document.addEventListener('click', function (e) {
		if (!e.target.closest('.nav__item')) { closeMenus(); }
	});

	/* Menú móvil ----------------------------------------------------------- */
	function setMobile(open) {
		navEl.classList.toggle('is-open', open);
		menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
		menuToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
		document.body.style.overflow = open ? 'hidden' : '';
		updateHeader();
	}

	if (menuToggle) {
		menuToggle.addEventListener('click', function () {
			setMobile(!navEl.classList.contains('is-open'));
		});
		$$('a', navEl).forEach(function (a) {
			a.addEventListener('click', function () { setMobile(false); });
		});
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && navEl.classList.contains('is-open')) {
				setMobile(false);
				menuToggle.focus();
			}
		});
	}

	/* Hero: titular rotativo con fundido de fondo -------------------------- */
	var hero = $('[data-hero]');
	var pauseBtn = $('[data-pause]');
	var paused = false;

	if (hero) {
		var slides = $$('.hero__slide', hero);
		var words = $$('.rotor__word', hero);
		var current = 0;
		var timer = null;
		var heroVisible = true;

		function showSlide(n) {
			var prev = current;
			slides[prev].classList.remove('is-active');
			words[prev].classList.remove('is-active');
			words[prev].classList.add('is-leaving');
			setTimeout(function () { words[prev].classList.remove('is-leaving'); }, 650);
			current = n;
			slides[n].classList.add('is-active');
			words[n].classList.add('is-active');
		}

		function stopHero() {
			clearInterval(timer);
			timer = null;
		}

		function startHero() {
			if (timer || paused || reduce.matches || !heroVisible || document.hidden) { return; }
			timer = setInterval(function () { showSlide((current + 1) % slides.length); }, 3200);
		}

		// Las demás escenas se cargan cuando la página ya terminó.
		function loadSlides() {
			$$('img[data-src]', hero).forEach(function (img) {
				img.src = img.getAttribute('data-src');
				img.removeAttribute('data-src');
			});
			startHero();
		}

		if (document.readyState === 'complete') {
			loadSlides();
		} else {
			window.addEventListener('load', loadSlides);
		}

		if ('IntersectionObserver' in window) {
			new IntersectionObserver(function (entries) {
				heroVisible = entries[0].isIntersecting;
				if (heroVisible) { startHero(); } else { stopHero(); }
			}, { threshold: 0.2 }).observe(hero);
		}

		document.addEventListener('visibilitychange', function () {
			if (document.hidden) { stopHero(); } else { startHero(); }
		});

		// Un solo botón pausa el titular y todos los carruseles.
		if (pauseBtn) {
			pauseBtn.addEventListener('click', function () {
				paused = !paused;
				root.classList.toggle('is-paused', paused);
				pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
				pauseBtn.setAttribute('aria-label', paused ? 'Reanudar animaciones' : 'Pausar animaciones');
				if (paused) { stopHero(); } else { startHero(); }
			});
		}
	}

	/* Frase que se ilumina por partes -------------------------------------- */
	var statement = $('[data-statement]');

	if (statement && !reduce.matches) {
		var parts = $$('span', statement);
		var ticking = false;

		function paintStatement() {
			ticking = false;
			var r = statement.getBoundingClientRect();
			var vh = window.innerHeight;
			var p = (vh * 0.86 - r.top) / (r.height + vh * 0.62);
			var active = Math.min(parts.length - 1, Math.max(0, Math.floor(p * parts.length)));
			parts.forEach(function (el, i) {
				el.setAttribute('data-state', i === active ? 'on' : (i < active ? 'past' : 'next'));
			});
		}

		window.addEventListener('scroll', function () {
			if (!ticking) {
				ticking = true;
				requestAnimationFrame(paintStatement);
			}
		}, { passive: true });
		paintStatement();
	}

	/* Carruseles continuos: la copia hace que el bucle no tenga saltos ------ */
	$$('[data-marquee] .marquee__track').forEach(function (track) {
		var copy = track.firstElementChild.cloneNode(true);
		copy.setAttribute('aria-hidden', 'true');
		$$('a', copy).forEach(function (a) { a.setAttribute('tabindex', '-1'); });
		$$('img', copy).forEach(function (img) { img.alt = ''; });
		track.appendChild(copy);
	});

	$$('[data-thumbs] .thumbs__row').forEach(function (row) {
		$$('img', row).forEach(function (img) { row.appendChild(img.cloneNode(true)); });
	});

	/* Entradas al hacer scroll --------------------------------------------- */
	var reveals = $$('.section__head, .quote, .flex-cards, .tech, .audience, .biz, .quotes, .prices, .maker, .ship, .steps');

	if ('IntersectionObserver' in window && !reduce.matches) {
		var revealObserver = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) {
					entry.target.classList.add('is-in');
					revealObserver.unobserve(entry.target);
				}
			});
		}, { rootMargin: '0px 0px -8% 0px' });

		reveals.forEach(function (el) {
			el.classList.add('reveal');
			revealObserver.observe(el);
		});
	}

	/* Cotizador: arma el mensaje y deja el enlace de WhatsApp listo --------- */
	$$('[data-quote]').forEach(function (form) {
		var preview = $('[data-quote-preview]', form.closest('.quote'));
		var send = $('[data-quote-send]', form);
		var status = $('[data-quote-status]', form);
		var techField = $('[data-quote-tecnica]', form);
		var techInputs = $$('input[name="tecnica"]', form);
		var prodInputs = $$('input[name="producto"]', form);
		var otro = $('[data-quote-otro]', form);
		var initialNote = status.textContent;

		function pick(name) {
			var el = $('input[name="' + name + '"]:checked', form);
			return el ? el.value : '';
		}

		function syncTecnicas() {
			var prod = $('input[name="producto"]:checked', form);
			var solo = prod && prod.getAttribute('data-solo');
			techField.hidden = !!prod && prod.hasAttribute('data-sin-tecnica');
			techInputs.forEach(function (input) {
				input.disabled = !!solo && input.value !== '' && input.value !== solo;
				if (input.disabled && input.checked) { techInputs[0].checked = true; }
			});
		}

		function buildMessage() {
			var nombre = form.elements.nombre.value.trim();
			var cantidad = pick('cantidad').toLowerCase();
			var tecnica = pick('tecnica');
			var msg = 'Hola, quisiera cotizar ' + (pick('producto') || otro.value.trim()) + '.';

			msg += ' Serían ' + (cantidad.indexOf('o más') > -1 ? cantidad : 'de ' + cantidad) + ' unidades';
			if (techField.hidden) {
				msg += '.';
			} else if (tecnica) {
				msg += ' con ' + tecnica.toLowerCase() + '.';
			} else {
				msg += ' y quisiera que me asesoren con la técnica.';
			}
			if (nombre) { msg += ' Mi nombre o empresa: ' + nombre + '.'; }
			return msg;
		}

		function update() {
			syncTecnicas();
			var msg = buildMessage();
			if (preview) { preview.textContent = msg; }
			send.href = WA + encodeURIComponent(msg);
			status.textContent = initialNote;
			status.classList.remove('is-sent');
		}

		/* Escribir un producto desmarca las opciones; elegir una borra lo escrito. */
		otro.addEventListener('input', function () {
			var escrito = otro.value.trim() !== '';
			prodInputs.forEach(function (input, i) { input.checked = !escrito && i === 0; });
		});
		prodInputs.forEach(function (input) {
			input.addEventListener('change', function () { otro.value = ''; });
		});

		form.addEventListener('input', update);
		form.addEventListener('change', update);
		form.addEventListener('submit', function (e) {
			e.preventDefault();
			send.click();
		});
		send.addEventListener('click', function () {
			status.textContent = 'Listo. Revisa WhatsApp y envía tu mensaje.';
			status.classList.add('is-sent');
		});
		update();
	});

	/* Tarjetas que se ensanchan -------------------------------------------- */
	$$('[data-flexcards]').forEach(function (wrap) {
		var cards = $$('.flex-card', wrap);
		function activate(card) {
			cards.forEach(function (c) { c.classList.toggle('is-active', c === card); });
		}
		cards.forEach(function (card) {
			card.addEventListener('mouseenter', function () { activate(card); });
			card.addEventListener('focusin', function () { activate(card); });
		});
	});

	/* Pestañas de técnicas ------------------------------------------------- */
	$$('[data-tabs]').forEach(function (wrap) {
		var tabs = $$('[role="tab"]', wrap);

		function select(tab, focus) {
			tabs.forEach(function (t) {
				var on = t === tab;
				t.setAttribute('aria-selected', on ? 'true' : 'false');
				t.tabIndex = on ? 0 : -1;
				$('#' + t.getAttribute('aria-controls')).hidden = !on;
			});
			if (focus) { tab.focus({ preventScroll: true }); }
			centerInBar(tab);
		}

		tabs.forEach(function (tab, i) {
			tab.addEventListener('click', function () { select(tab, false); });
			tab.addEventListener('keydown', function (e) {
				var next = null;
				if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { next = tabs[(i + 1) % tabs.length]; }
				if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { next = tabs[(i - 1 + tabs.length) % tabs.length]; }
				if (e.key === 'Home') { next = tabs[0]; }
				if (e.key === 'End') { next = tabs[tabs.length - 1]; }
				if (next) {
					e.preventDefault();
					select(next, true);
				}
			});
		});
	});

	/* Carnet: frente y reverso --------------------------------------------- */
	var flip = $('[data-carnet-flip]');

	if (flip) {
		flip.addEventListener('click', function () {
			var on = $('[data-carnet]').classList.toggle('is-flipped');
			flip.setAttribute('aria-pressed', on ? 'true' : 'false');
			flip.textContent = on ? 'Ver frente' : 'Ver reverso';
		});
	}

	/* Testimonios ---------------------------------------------------------- */
	var quotes = $('[data-quotes]');

	if (quotes) {
		var prev = $('[data-quotes-prev]');
		var next = $('[data-quotes-next]');
		var step = function () { return quotes.firstElementChild.getBoundingClientRect().width + 20; };

		function syncQuotes() {
			prev.disabled = quotes.scrollLeft < 8;
			next.disabled = quotes.scrollLeft + quotes.clientWidth > quotes.scrollWidth - 8;
		}

		prev.addEventListener('click', function () { quotes.scrollBy({ left: -step() }); });
		next.addEventListener('click', function () { quotes.scrollBy({ left: step() }); });
		quotes.addEventListener('scroll', syncQuotes, { passive: true });
		window.addEventListener('resize', syncQuotes);
		syncQuotes();
	}

	/* Pasos: uno abierto a la vez y cambia la imagen ------------------------ */
	$$('[data-steps]').forEach(function (wrap) {
		var items = $$('.step', wrap);
		var images = $$('.steps__media img', wrap);

		items.forEach(function (item, i) {
			$('button', item).addEventListener('click', function () {
				items.forEach(function (it, k) {
					var on = k === i;
					it.classList.toggle('is-open', on);
					$('button', it).setAttribute('aria-expanded', on ? 'true' : 'false');
					if (images[k]) { images[k].classList.toggle('is-active', on); }
				});
			});
		});
	});

	/* Catálogo: filtro por categoría y búsqueda ----------------------------- */
	var catalog = $('[data-catalog]');

	if (catalog) {
		var groups = $$('[data-group]', catalog);
		var chips = $$('[data-filter]');
		var search = $('[data-search]');
		var empty = $('[data-empty]');
		var count = $('[data-count]');
		var soloDisponibles = $('[data-disponibles]');

		function normalize(s) {
			return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
		}

		function applyFilter(id, scroll) {
			var q = search ? normalize(search.value.trim()) : '';
			var total = 0;

			groups.forEach(function (group) {
				var matchGroup = id === 'todo' || group.getAttribute('data-group') === id;
				var visibles = 0;
				$$('.pcard', group).forEach(function (card) {
					var ok = matchGroup && (!q || normalize(card.getAttribute('data-name')).indexOf(q) > -1);
					if (ok && soloDisponibles && soloDisponibles.checked && card.hasAttribute('data-agotado')) { ok = false; }
					card.hidden = !ok;
					if (ok) { visibles++; }
				});
				group.hidden = visibles === 0;
				total += visibles;
			});

			chips.forEach(function (chip) {
				var on = chip.getAttribute('data-filter') === id;
				if (on) {
					chip.setAttribute('aria-current', 'true');
					centerInBar(chip);
				} else {
					chip.removeAttribute('aria-current');
				}
			});

			if (empty) { empty.hidden = total > 0; }
			if (count) { count.textContent = total + (total === 1 ? ' producto' : ' productos'); }
			if (scroll) { catalog.scrollIntoView({ block: 'start' }); }
		}

		function currentId() {
			var el = chips.filter(function (c) { return c.hasAttribute('aria-current'); })[0];
			return el ? el.getAttribute('data-filter') : 'todo';
		}

		chips.forEach(function (chip) {
			chip.addEventListener('click', function (e) {
				e.preventDefault();
				var id = chip.getAttribute('data-filter');
				history.replaceState(null, '', id === 'todo' ? location.pathname : '#' + id);
				applyFilter(id, true);
			});
		});

		if (search) {
			search.addEventListener('input', function () { applyFilter(currentId(), false); });
		}
		if (soloDisponibles) {
			soloDisponibles.addEventListener('change', function () { applyFilter(currentId(), false); });
		}

		function fromHash() {
			var id = location.hash.replace('#', '');
			var valid = chips.some(function (c) { return c.getAttribute('data-filter') === id; });
			applyFilter(valid ? id : 'todo', false);
		}

		window.addEventListener('hashchange', fromHash);
		fromHash();
	}

	/* Mapa de envíos: puntos de Colombia y arcos desde Bogotá --------------- */
	var canvas = $('[data-map]');

	if (canvas) {
		var ctx = canvas.getContext('2d');

		// Contorno simplificado [lat, lon]. Es decorativo, no cartográfico.
		var COLOMBIA = [[12.46, -71.67], [12.2, -72.2], [11.75, -72.6], [11.55, -72.95], [11.3, -73.7], [11.25, -74.2], [11.05, -74.85], [10.75, -75.3], [10.4, -75.55], [9.9, -75.7], [9.45, -75.65], [9.35, -76.1], [8.9, -76.45], [8.55, -76.85], [7.95, -76.75], [8.3, -77], [8.67, -77.36], [7.8, -77.75], [7.25, -77.9], [6.7, -77.45], [6.2, -77.45], [5.6, -77.4], [5.45, -77.55], [4.9, -77.35], [4.2, -77.45], [3.85, -77.1], [3.5, -77.5], [2.95, -77.7], [2.6, -78.1], [2.6, -78.6], [2, -78.75], [1.75, -79], [1.45, -78.85], [1.2, -78.3], [0.85, -77.7], [0.8, -77.2], [0.4, -76.7], [0.35, -76.3], [0.1, -75.7], [-0.1, -75.25], [-0.2, -74.8], [-0.6, -74.3], [-1, -73.6], [-1.3, -73.1], [-1.8, -72.6], [-2.3, -71.9], [-2.25, -71.1], [-2.45, -70.6], [-2.75, -70.1], [-3.4, -70.6], [-3.8, -70.6], [-4.22, -69.95], [-2.9, -69.62], [-1.6, -69.45], [-1.1, -69.45], [-0.5, -70], [0.1, -70.05], [0.6, -70.05], [0.6, -69.2], [0.95, -69.2], [1.1, -69.85], [1.72, -69.85], [1.72, -68.15], [1.2, -67.1], [2, -67.2], [2.8, -67.85], [3.9, -67.85], [4.6, -67.85], [5.3, -67.75], [6.2, -67.45], [6.1, -68.5], [6.1, -69.4], [7, -70.1], [7.1, -71], [7, -72], [7.4, -72.45], [8, -72.4], [8.6, -72.4], [9.1, -72.95], [9.75, -73.05], [10.4, -72.95], [11.1, -72.55], [11.65, -71.95], [11.85, -71.35], [12.2, -71.1]];
		var BOGOTA = { n: 'Bogotá', lat: 4.71, lon: -74.07 };
		var CIUDADES = [
			{ n: 'Barranquilla', lat: 10.98, lon: -74.8, label: 1 }, { n: 'Medellín', lat: 6.25, lon: -75.56, label: 1 },
			{ n: 'Cali', lat: 3.45, lon: -76.53, label: 1 }, { n: 'Bucaramanga', lat: 7.12, lon: -73.12, label: 1 },
			{ n: 'Cúcuta', lat: 7.89, lon: -72.5 }, { n: 'Pasto', lat: 1.21, lon: -77.28, label: 1 },
			{ n: 'Leticia', lat: -4.2, lon: -69.94, label: 1 }, { n: 'Puerto Carreño', lat: 6.19, lon: -67.48 },
			{ n: 'Riohacha', lat: 11.54, lon: -72.91 }, { n: 'San Andrés', lat: 12.58, lon: -81.7, label: 1 },
			{ n: 'Quibdó', lat: 5.69, lon: -76.66 }, { n: 'Mitú', lat: 1.25, lon: -70.23 },
		];
		var LON = [-82.2, -66.6];
		var LAT = [13.2, -4.6];
		var dots = null;
		var W = 0;
		var H = 0;
		var raf = null;
		var mapVisible = false;

		function inside(lat, lon) {
			var hit = false;
			for (var i = 0, j = COLOMBIA.length - 1; i < COLOMBIA.length; j = i++) {
				var a = COLOMBIA[i];
				var b = COLOMBIA[j];
				if ((a[0] > lat) !== (b[0] > lat) && lon < (b[1] - a[1]) * (lat - a[0]) / (b[0] - a[0]) + a[1]) {
					hit = !hit;
				}
			}
			return hit;
		}

		function project(lat, lon) {
			return {
				x: (lon - LON[0]) / (LON[1] - LON[0]) * W,
				y: (lat - LAT[0]) / (LAT[1] - LAT[0]) * H,
			};
		}

		function setup() {
			var box = canvas.getBoundingClientRect();
			var dpr = Math.min(window.devicePixelRatio || 1, 2);
			W = box.width;
			H = box.height;
			canvas.width = Math.round(W * dpr);
			canvas.height = Math.round(H * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

			// Malla de puntos precalculada dentro del contorno.
			var gap = Math.max(6, W / 64);
			dots = [];
			for (var y = gap / 2; y < H; y += gap) {
				for (var x = gap / 2; x < W; x += gap) {
					var lon = LON[0] + x / W * (LON[1] - LON[0]);
					var lat = LAT[0] + y / H * (LAT[1] - LAT[0]);
					if (inside(lat, lon)) { dots.push([x, y]); }
				}
			}
			drawMap(0);
		}

		function curvePoint(a, c, b, t) {
			var u = 1 - t;
			return {
				x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
				y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
			};
		}

		function drawMap(time) {
			ctx.clearRect(0, 0, W, H);
			ctx.fillStyle = 'rgba(255, 255, 255, 0.26)';
			dots.forEach(function (d) {
				ctx.beginPath();
				ctx.arc(d[0], d[1], 1.5, 0, 6.283);
				ctx.fill();
			});

			var origin = project(BOGOTA.lat, BOGOTA.lon);
			ctx.font = '500 13px Inter, system-ui, sans-serif';

			CIUDADES.forEach(function (city, i) {
				var p = project(city.lat, city.lon);
				var mid = { x: (origin.x + p.x) / 2, y: (origin.y + p.y) / 2 };
				var dist = Math.hypot(p.x - origin.x, p.y - origin.y);
				var ctrl = { x: mid.x, y: mid.y - dist * 0.32 };

				ctx.strokeStyle = 'rgba(255, 105, 0, 0.5)';
				ctx.lineWidth = 1.25;
				ctx.beginPath();
				ctx.moveTo(origin.x, origin.y);
				ctx.quadraticCurveTo(ctrl.x, ctrl.y, p.x, p.y);
				ctx.stroke();

				// Paquete que viaja por el arco.
				if (time) {
					var t = ((time / 3200) + i * 0.137) % 1;
					var q = curvePoint(origin, ctrl, p, t);
					ctx.fillStyle = '#ffffff';
					ctx.beginPath();
					ctx.arc(q.x, q.y, 2.4, 0, 6.283);
					ctx.fill();
				}

				ctx.fillStyle = '#ff6900';
				ctx.beginPath();
				ctx.arc(p.x, p.y, 3, 0, 6.283);
				ctx.fill();

				if (city.label && W > 300) {
					ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
					ctx.textAlign = p.x < W * 0.3 ? 'left' : 'right';
					ctx.fillText(city.n, p.x + (p.x < W * 0.3 ? 8 : -8), p.y - 6);
				}
			});

			// Bogotá, el punto de salida.
			var pulse = time && !reduce.matches ? (time % 2000) / 2000 : 0;
			ctx.strokeStyle = 'rgba(255, 105, 0, ' + (1 - pulse) * 0.7 + ')';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(origin.x, origin.y, 7 + pulse * 18, 0, 6.283);
			ctx.stroke();
			ctx.fillStyle = '#ffffff';
			ctx.beginPath();
			ctx.arc(origin.x, origin.y, 5.5, 0, 6.283);
			ctx.fill();
			ctx.font = '600 15px Inter, system-ui, sans-serif';
			ctx.textAlign = 'left';
			ctx.fillText(BOGOTA.n, origin.x + 12, origin.y + 18);
		}

		function loop(time) {
			drawMap(time);
			raf = mapVisible && !root.classList.contains('is-paused') ? requestAnimationFrame(loop) : null;
		}

		function play() {
			if (!raf && !reduce.matches && mapVisible) { raf = requestAnimationFrame(loop); }
		}

		setup();

		var resizeTimer = null;
		window.addEventListener('resize', function () {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(setup, 200);
		});

		if (document.fonts && document.fonts.ready) {
			document.fonts.ready.then(function () { drawMap(0); });
		}

		if ('IntersectionObserver' in window) {
			new IntersectionObserver(function (entries) {
				mapVisible = entries[0].isIntersecting;
				if (mapVisible) { play(); }
			}).observe(canvas);
		}

		if (pauseBtn) { pauseBtn.addEventListener('click', play); }
	}
})();
