(function loadInteractiveMarkdeepSupport() {
	"use strict";

	if (!document.querySelector("link[data-cg-demo-styles]")) {
		const stylesheet = document.createElement("link");
		stylesheet.rel = "stylesheet";
		stylesheet.href = "/shared/interactive/cg-demo.css?v=20260826u";
		stylesheet.dataset.cgDemoStyles = "";
		document.head.append(stylesheet);
	}

	const options = window.markdeepOptions || {};
	const previousOnLoad = options.onLoad;

	options.onLoad = function initializeInteractiveDemos() {
		if (typeof previousOnLoad === "function") {
			previousOnLoad();
		}

		if (document.querySelector("script[data-cg-demo-bootstrap]")) {
			return;
		}

		const importMap = document.createElement("script");
		importMap.type = "importmap";
		importMap.textContent = JSON.stringify({
			imports: {
				three: "/shared/interactive/vendor/three/build/three.module.min.js",
				"three/addons/": "/shared/interactive/vendor/three/addons/"
			}
		});
		document.head.append(importMap);

		const bootstrap = document.createElement("script");
		bootstrap.type = "module";
		bootstrap.src = "/shared/interactive/bootstrap.js?v=20260826u";
		bootstrap.dataset.cgDemoBootstrap = "";
		document.head.append(bootstrap);
	};

	window.markdeepOptions = options;
})();
