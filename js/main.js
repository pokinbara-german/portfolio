(function () {
	'use strict';

	const PHOTOSWIPE_URL = 'https://cdn.jsdelivr.net/npm/photoswipe@5.4.4/dist/';
	const DEFAULT_LANG = 'en';

	const root = document.documentElement;
	let currentLang = DEFAULT_LANG;
	let lightbox = null;

	function readStorage(key) {
		try {
			return localStorage.getItem(key);
		} catch (error) {
			return null;
		}
	}

	function writeStorage(key, value) {
		try {
			localStorage.setItem(key, value);
		} catch (error) {
			// Ignore
		}
	}

	function applyTheme(theme) {
		// Bulma palettes switch
		root.setAttribute('data-theme', theme);

		document.getElementById('theme-toggle').checked = theme === 'dark';
	}

	/**
	 * Returns translation or key if it is not presented in translations.
	 * @param {string} key - translation key
	 * @returns {string}
	 */
	function translation(key) {
		let dictionary = window.I18N[currentLang] || {};

		return dictionary[key] !== undefined ? dictionary[key] : key;
	}

	/**
	 * Sets counter and text for all bages.
	 */
	function updatePhotoBadges() {
		document.querySelectorAll('.project-gallery').forEach(function (gallery) {
			const badge = gallery.querySelector('.photo-badge');
			const extra = gallery.querySelectorAll('a').length - 1;

			badge.textContent = extra > 0 ? translation('gallery.more').replace('{count}', extra.toString()) : '';
		});
	}

	/**
	 * Sets translated texts for gallery controls.
	 */
	function updateLightboxLabels() {
		if (!lightbox) {
			return;
		}

		lightbox.options.closeTitle = translation('pswp.close');
		lightbox.options.zoomTitle = translation('pswp.zoom');
		lightbox.options.arrowPrevTitle = translation('pswp.prev');
		lightbox.options.arrowNextTitle = translation('pswp.next');
		lightbox.options.errorMsg = translation('pswp.error');
	}

	/**
	 * Sets translated strings everywhere.
	 * @param {string} lang - alpha2 language name
	 */
	function applyLanguage(lang) {
		currentLang = window.I18N[lang] ? lang : DEFAULT_LANG;

		root.lang = currentLang;
		document.title = translation('meta.title');

		document.querySelectorAll('[data-i18n]').forEach(function (element) {
			element.textContent = translation(element.getAttribute('data-i18n'));
		});

		document.querySelectorAll('[data-i18n-alt]').forEach(function (element) {
			element.alt = translation(element.getAttribute('data-i18n-alt'));
		});

		document.querySelectorAll('[data-i18n-aria]').forEach(function (element) {
			element.setAttribute('aria-label', translation(element.getAttribute('data-i18n-aria')));
		});

		document.querySelectorAll('.lang-switch-option').forEach(function (option) {
			option.classList.toggle('is-active', option.getAttribute('data-lang') === currentLang);
		});

		updatePhotoBadges();
		updateLightboxLabels();
	}

	function initTheme() {
		const toggle = document.getElementById('theme-toggle');
		const saved = readStorage('theme');
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

		applyTheme(saved || (prefersDark ? 'dark' : 'light'));

		toggle.addEventListener('change', function () {
			const next = toggle.checked ? 'dark' : 'light';

			applyTheme(next);
			writeStorage('theme', next);
		});
	}

	function initLanguage() {
		const saved = readStorage('lang');
		const browserLang = (navigator.language || '').slice(0, 2);

		applyLanguage(saved || (browserLang === 'ru' ? 'ru' : DEFAULT_LANG));

		document.getElementById('lang-toggle').addEventListener('click', function () {
			const next = currentLang === 'en' ? 'ru' : 'en';

			applyLanguage(next);
			writeStorage('lang', next);
		});
	}

	function initBurger() {
		const burger = document.querySelector('.navbar-burger');
		const menu = document.getElementById(burger.getAttribute('data-target'));

		function setOpen(isOpen) {
			burger.classList.toggle('is-active', isOpen);
			menu.classList.toggle('is-active', isOpen);
			burger.setAttribute('aria-expanded', isOpen);
		}

		burger.addEventListener('click', function () {
			setOpen(!burger.classList.contains('is-active'));
		});

		// Close the menu after choosing a link on mobile
		menu.querySelectorAll('a.navbar-item').forEach(function (link) {
			link.addEventListener('click', function () {
				setOpen(false);
			});
		});
	}

	function initScrollProgress() {
		const bar = document.getElementById('scroll-progress-bar');

		function update() {
			const scrollable = document.documentElement.scrollHeight - window.innerHeight;
			const progress = scrollable > 0 ? window.scrollY / scrollable : 0;

			bar.style.transform = 'scaleX(' + Math.min(Math.max(progress, 0), 1) + ')';
		}

		window.addEventListener('scroll', update, { passive: true });
		window.addEventListener('resize', update);
		update();
	}

	/**
	 * Every .project-gallery is a separate gallery.
	 * PhotoSwipe is an ES module, so it is loaded with dynamic import(),
	 * which also works when index.html is opened from the disk.
	 */
	function initGallery() {
		import(PHOTOSWIPE_URL + 'photoswipe-lightbox.esm.min.js')
			.then(function (module) {
				const PhotoSwipeLightbox = module.default;

				lightbox = new PhotoSwipeLightbox({
					gallery: '.project-gallery',
					children: 'a',
					paddingFn: function (viewportSize) {
						if (viewportSize.x < 769) {
							return { top: 48, bottom: 24, left: 8, right: 8 };
						}

						return { top: 60, bottom: 60, left: 80, right: 80 };
					},
					pswpModule: function () {
						return import(PHOTOSWIPE_URL + 'photoswipe.esm.min.js');
					}
				});

				updateLightboxLabels();
				lightbox.init();
			})
			.catch(function (error) {
				console.error('PhotoSwipe failed to load:', error);
			});
	}

	/**
	 * Collects the tags from all projects and builds one cloud.
	 * More common tags are first.
	 */
	function initTechCloud() {
		const section = document.getElementById('tech-cloud');
		const container = document.getElementById('tech-cloud-tags');
		const counts = {};

		document.querySelectorAll('.project-tags .tag').forEach(function (tag) {
			const name = tag.textContent.trim();
			const key = name.toLowerCase();

			if (!name) {
				return;
			}

			if (!counts[key]) {
				counts[key] = { name: name, count: 0 };
			}

			counts[key].count += 1;
		});

		const items = Object.keys(counts).map(function (key) {
			return counts[key];
		});

		if (!items.length) {
			return;
		}

		// Most popular first, then alphabetically
		items.sort(function (a, b) {
			return b.count - a.count || a.name.localeCompare(b.name);
		});

		items.forEach(function (item) {
			const group = document.createElement('div');
			const label = document.createElement('span');

			group.className = 'tags has-addons';

			label.className = 'tag is-link is-light is-normal';
			label.textContent = item.name;

			group.appendChild(label);
			container.appendChild(group);
		});

		section.hidden = false;
	}

	// ---------- Start ----------

	document.getElementById('year').textContent = new Date().getFullYear().toString();

	initTheme();
	initLanguage();
	initBurger();
	initGallery();
	initScrollProgress();
	initTechCloud();
})();
