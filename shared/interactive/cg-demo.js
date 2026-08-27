import { loadDemo } from "./demo-registry.js?v=20260826u";
import { getRuntime } from "./runtime.js?v=20260826u";

const initializeObserver = new IntersectionObserver((entries) => {
	for (const entry of entries) {
		if (entry.isIntersecting) {
			entry.target.initialize();
			initializeObserver.unobserve(entry.target);
		}
	}
}, { rootMargin: "320px" });

const visibilityObserver = new IntersectionObserver((entries) => {
	for (const entry of entries) {
		entry.target.setVisible(entry.isIntersecting);
	}
});

class CGDemoElement extends HTMLElement {
	constructor() {
		super();
		this.runtime = undefined;
		this.demo = undefined;
		this.dirty = true;
		this.visible = false;
		this.animating = false;
		this.initialized = false;
		this.failed = false;
	}

	connectedCallback() {
		if (this.surface) {
			return;
		}

		const aspect = this.getAttribute("aspect") || "16:10";
		const [aspectWidth, aspectHeight] = aspect.split(":").map(Number);
		if (aspectWidth > 0 && aspectHeight > 0) {
			this.style.setProperty("--cg-demo-aspect", `${aspectWidth} / ${aspectHeight}`);
		}

		this.surface = document.createElement("div");
		this.surface.className = "cg-demo__surface";

		this.fallback = this.querySelector("[data-fallback]");
		if (this.fallback) {
			this.fallback.classList.add("cg-demo__fallback");
			this.surface.append(this.fallback);
		}

		this.canvas = document.createElement("canvas");
		this.canvas.className = "cg-demo__canvas";
		this.canvas.tabIndex = 0;
		this.canvas.setAttribute("aria-label", this.getAttribute("aria-label") || "Interactive 3D demonstration");

		this.overlay = document.createElement("div");
		this.overlay.className = "cg-demo__overlay";
		this.overlay.setAttribute("aria-hidden", "true");

		this.status = document.createElement("div");
		this.status.className = "cg-demo__status";
		this.status.setAttribute("role", "status");
		this.status.textContent = "Loading interactive demonstration…";

		this.controls = document.createElement("div");
		this.controls.className = "cg-demo__controls";
		this.controls.setAttribute("aria-label", "Demonstration controls");

		this.surface.append(this.canvas, this.overlay, this.status);
		this.append(this.surface, this.controls);

		this.resizeObserver = new ResizeObserver(() => {
			if (this.demo) {
				this.demo.resize(this.getRenderSize());
			}
			this.invalidate();
		});
		this.resizeObserver.observe(this.surface);

		initializeObserver.observe(this);
		visibilityObserver.observe(this);
	}

	disconnectedCallback() {
		initializeObserver.unobserve(this);
		visibilityObserver.unobserve(this);
		this.resizeObserver?.disconnect();
		this.demo?.dispose();
		this.runtime?.unregister(this);
	}

	async initialize() {
		if (this.initialized || this.failed) {
			return;
		}

		this.initialized = true;

		try {
			this.runtime = getRuntime();
			const module = await loadDemo(this.getAttribute("demo"));
			this.demo = await module.createDemo({
				host: this,
				canvas: this.canvas,
				overlay: this.overlay,
				controls: this.controls,
				invalidate: () => this.invalidate(),
				setAnimating: (animating) => {
					this.animating = Boolean(animating);
					this.invalidate();
				}
			});
			this.demo.resize(this.getRenderSize());
			this.runtime.register(this);
		} catch (error) {
			this.fail(error);
		}
	}

	setVisible(visible) {
		this.visible = visible;
		if (visible) {
			this.invalidate();
		}
	}

	invalidate() {
		this.dirty = true;
		this.runtime?.invalidate(this);
	}

	getRenderSize() {
		const bounds = this.surface?.getBoundingClientRect();
		return bounds ? { width: bounds.width, height: bounds.height } : { width: 0, height: 0 };
	}

	render(frame) {
		this.demo.render(frame);
	}

	copyFrame(source, width, height) {
		if (this.canvas.width !== width || this.canvas.height !== height) {
			this.canvas.width = width;
			this.canvas.height = height;
		}

		const context = this.canvas.getContext("2d");
		context.clearRect(0, 0, width, height);
		context.drawImage(source, 0, 0, width, height);
		context.globalCompositeOperation = "destination-over";
		context.fillStyle = "#0a0f10";
		context.fillRect(0, 0, width, height);
		context.globalCompositeOperation = "source-over";

		if (!this.hasAttribute("ready")) {
			this.setAttribute("ready", "");
			this.status.hidden = true;
		}
	}

	handleRenderError(error) {
		this.fail(error);
	}

	fail(error) {
		this.failed = true;
		this.runtime?.unregister(this);
		this.demo?.dispose();
		this.controls.hidden = true;
		this.setAttribute("failed", "");
		this.status.hidden = false;
		const isLocal = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(window.location.hostname);
		this.status.textContent = isLocal && error instanceof Error
			? `Interactive 3D failed: ${error.message}`
			: "Interactive 3D is unavailable. The static figure is shown instead.";
		console.error("Unable to initialize interactive demo", error);
	}
}

if (!customElements.get("cg-demo")) {
	customElements.define("cg-demo", CGDemoElement);
}
