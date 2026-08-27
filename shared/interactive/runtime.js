import * as THREE from "three";

const CONTEXT_ATTRIBUTES = {
	alpha: true,
	antialias: true,
	depth: true,
	powerPreference: "high-performance"
};

class SharedRenderRuntime {
	constructor() {
		this.canvas = document.createElement("canvas");
		this.canvas.setAttribute("aria-hidden", "true");
		this.canvas.className = "cg-demo__shared-canvas";

		const context = this.canvas.getContext("webgl2", CONTEXT_ATTRIBUTES);
		if (!context) {
			throw new Error("WebGL2 is not available in this browser.");
		}

		this.renderer = new THREE.WebGLRenderer({
			canvas: this.canvas,
			context,
			alpha: true,
			antialias: true
		});
		this.renderer.setPixelRatio(1);
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.clients = new Set();
		this.framePending = false;
		this.lastTime = undefined;
		this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

		document.addEventListener("visibilitychange", () => {
			this.lastTime = undefined;
			if (!document.hidden) {
				this.clients.forEach((client) => client.invalidate());
			}
		});

		this.reducedMotion.addEventListener("change", () => {
			this.clients.forEach((client) => client.invalidate());
		});
	}

	register(client) {
		this.clients.add(client);
		this.invalidate(client);
	}

	unregister(client) {
		this.clients.delete(client);
	}

	invalidate(client) {
		client.dirty = true;
		this.requestFrame();
	}

	requestFrame() {
		if (this.framePending || document.hidden) {
			return;
		}

		this.framePending = true;
		requestAnimationFrame((time) => this.renderFrame(time));
	}

	renderFrame(time) {
		this.framePending = false;
		const delta = this.lastTime === undefined ? 0 : Math.min((time - this.lastTime) / 1000, 0.05);
		this.lastTime = time;
		let needsAnotherFrame = false;

		for (const client of this.clients) {
			const canAnimate = client.animating && !this.reducedMotion.matches;
			if (!client.visible || (!client.dirty && !canAnimate)) {
				continue;
			}

			client.dirty = false;

			try {
				this.renderClient(client, time / 1000, delta);
			} catch (error) {
				client.handleRenderError(error);
			}

			needsAnotherFrame ||= canAnimate && client.visible;
		}

		if (needsAnotherFrame) {
			this.requestFrame();
		} else {
			this.lastTime = undefined;
		}
	}

	renderClient(client, time, delta) {
		const size = client.getRenderSize();
		if (!size || size.width < 1 || size.height < 1) {
			return;
		}

		const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
		const width = Math.max(1, Math.round(size.width));
		const height = Math.max(1, Math.round(size.height));
		const desiredBufferWidth = Math.max(1, Math.round(width * pixelRatio));
		const desiredBufferHeight = Math.max(1, Math.round(height * pixelRatio));
		this.renderer.setPixelRatio(1);
		this.renderer.setSize(desiredBufferWidth, desiredBufferHeight, false);
		const bufferWidth = this.canvas.width;
		const bufferHeight = this.canvas.height;
		this.renderer.setViewport(0, 0, bufferWidth, bufferHeight);
		this.renderer.setScissorTest(false);
		this.renderer.autoClear = true;
		this.renderer.setClearColor(0x0a0f10, 1);

		client.render({
			renderer: this.renderer,
			width,
			height,
			bufferWidth,
			bufferHeight,
			pixelRatio,
			time,
			delta
		});

		client.copyFrame(this.canvas, bufferWidth, bufferHeight);
	}
}

let runtime;

export function getRuntime() {
	if (!runtime) {
		runtime = new SharedRenderRuntime();
	}
	return runtime;
}
