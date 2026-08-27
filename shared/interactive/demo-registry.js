const demoLoaders = new Map([
	["camera-projection", () => import("./demos/camera-projection.js?v=20260826u")],
	["vector-from-basis", () => import("./demos/vector-foundations.js?v=20260826u")],
	["vector-addition", () => import("./demos/vector-foundations.js?v=20260826u")],
	["vector-dot-product", () => import("./demos/vector-foundations.js?v=20260826u")]
]);

export async function loadDemo(name) {
	const load = demoLoaders.get(name);

	if (!load) {
		throw new Error(`Unknown interactive demo: ${name}`);
	}

	return load();
}
