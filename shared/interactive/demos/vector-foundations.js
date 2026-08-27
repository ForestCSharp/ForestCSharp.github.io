import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createButton, createRangeControl } from "../controls.js?v=20260826u";

const EPSILON = 1e-5;
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(8, 6.5, 9);
const AXIS_COLORS = [0xff7b72, 0x6ee7a8, 0x8eb7ff];
const VECTOR_A_COLOR = 0xf6d365;
const VECTOR_B_COLOR = 0xff9d69;
const RESULT_COLOR = 0x77d9ff;
const PROJECTION_COLOR = 0xc59cff;
const ORIGIN = new THREE.Vector3();

function disposeScene(scene) {
	const geometries = new Set();
	const materials = new Set();

	scene.traverse((object) => {
		if (object.geometry) {
			geometries.add(object.geometry);
		}

		const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
		objectMaterials.filter(Boolean).forEach((material) => materials.add(material));
	});

	geometries.forEach((geometry) => geometry.dispose());
	materials.forEach((material) => material.dispose());
}

function makeArrow(color, opacity = 1) {
	const arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), ORIGIN, 1, color, 0.2, 0.1);
	if (opacity < 1) {
		arrow.traverse((object) => {
			if (object.material) {
				object.material.transparent = true;
				object.material.opacity = opacity;
			}
		});
	}
	return arrow;
}

function setArrow(arrow, vector, origin = ORIGIN, maximumLength = Infinity) {
	const length = vector.length();
	arrow.visible = length > EPSILON;
	arrow.position.copy(origin);
	if (!arrow.visible) {
		return;
	}

	const displayLength = Math.min(length, maximumLength);
	arrow.setDirection(vector.clone().normalize());
	arrow.setLength(displayLength, Math.min(0.32, displayLength * 0.18), Math.min(0.16, displayLength * 0.09));
}

function makeLabel(text, modifier) {
	const label = document.createElement("span");
	label.className = `cg-demo__vector-label ${modifier}`;
	label.textContent = text;
	return label;
}

function makeLegend(items) {
	const legend = document.createElement("div");
	legend.className = "cg-demo__legend";
	for (const item of items) {
		const entry = document.createElement("span");
		const swatch = document.createElement("i");
		swatch.className = `cg-demo__swatch cg-demo__swatch--${item.swatch}`;
		entry.append(swatch, document.createTextNode(item.label));
		legend.append(entry);
	}
	return legend;
}

function makeMetrics(context, entries) {
	const metrics = document.createElement("div");
	metrics.className = "cg-demo__metrics";
	metrics.setAttribute("role", "status");
	metrics.setAttribute("aria-live", "polite");
	const outputs = entries.map(() => document.createElement("span"));
	metrics.append(...outputs);
	context.controls.append(metrics);
	return outputs;
}

function addHelp(context, text) {
	const help = document.createElement("p");
	help.className = "cg-demo__help";
	help.id = `cg-demo-help-${Math.random().toString(36).slice(2)}`;
	help.textContent = `${text} · Drag to orbit · Arrow keys orbit when the canvas is focused`;
	context.controls.append(help);
	context.canvas.setAttribute("aria-describedby", help.id);
}

function formatNumber(value) {
	return Math.abs(value) < 0.005 ? "0.00" : value.toFixed(2);
}

function formatVector(vector) {
	return `[${formatNumber(vector.x)}, ${formatNumber(vector.y)}, ${formatNumber(vector.z)}]`;
}

function createEnvironment(context, { showWorldAxes = true } = {}) {
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0x0a0f10);
	scene.fog = new THREE.Fog(0x0a0f10, 16, 34);

	const camera = new THREE.PerspectiveCamera(42, 16 / 10, 0.1, 100);
	const target = new THREE.Vector3(0, 0.7, 0);
	camera.position.copy(DEFAULT_CAMERA_POSITION);
	camera.lookAt(target);

	const orbitControls = new OrbitControls(camera, context.canvas);
	orbitControls.target.copy(target);
	orbitControls.enableDamping = false;
	orbitControls.enablePan = false;
	orbitControls.minDistance = 6;
	orbitControls.maxDistance = 24;

	const grid = new THREE.GridHelper(14, 14, 0x51615d, 0x263b35);
	grid.position.y = -0.015;
	scene.add(grid);

	const origin = new THREE.Mesh(
		new THREE.SphereGeometry(0.11, 18, 12),
		new THREE.MeshBasicMaterial({ color: 0xf4efe5 })
	);
	scene.add(origin);

	if (showWorldAxes) {
		AXIS_COLORS.forEach((color, index) => {
			const axis = new THREE.Vector3(index === 0 ? 1.35 : 0, index === 1 ? 1.35 : 0, index === 2 ? 1.35 : 0);
			const arrow = makeArrow(color, 0.72);
			setArrow(arrow, axis);
			scene.add(arrow);
		});
	}

	let orbitCallback = () => context.invalidate();
	function handleOrbitChange() {
		orbitCallback();
	}

	function handleKeyboard(event) {
		const spherical = new THREE.Spherical().setFromVector3(
			camera.position.clone().sub(orbitControls.target)
		);
		let handled = true;

		switch (event.key) {
			case "ArrowLeft": spherical.theta -= 0.12; break;
			case "ArrowRight": spherical.theta += 0.12; break;
			case "ArrowUp": spherical.phi -= 0.10; break;
			case "ArrowDown": spherical.phi += 0.10; break;
			case "+":
			case "=": spherical.radius = Math.max(orbitControls.minDistance, spherical.radius - 1); break;
			case "-": spherical.radius = Math.min(orbitControls.maxDistance, spherical.radius + 1); break;
			default: handled = false;
		}

		if (!handled) {
			return;
		}

		event.preventDefault();
		spherical.makeSafe();
		camera.position.copy(orbitControls.target).add(new THREE.Vector3().setFromSpherical(spherical));
		camera.lookAt(orbitControls.target);
		orbitControls.update();
	}

	function positionLabel(label, point, width, height) {
		const projected = point.clone().project(camera);
		const visible = projected.z > -1 && projected.z < 1;
		label.hidden = !visible;
		if (!visible) {
			return;
		}
		label.style.left = `${(projected.x * 0.5 + 0.5) * width}px`;
		label.style.top = `${(-projected.y * 0.5 + 0.5) * height}px`;
	}

	function resetCamera() {
		camera.position.copy(DEFAULT_CAMERA_POSITION);
		orbitControls.target.copy(target);
		camera.lookAt(target);
		orbitControls.update();
	}

	orbitControls.addEventListener("change", handleOrbitChange);
	context.canvas.addEventListener("keydown", handleKeyboard);

	return {
		scene,
		camera,
		orbitControls,
		positionLabel,
		resetCamera,
		setOrbitCallback(callback) {
			orbitCallback = callback;
		},
		resize(size) {
			if (size.width > 0 && size.height > 0) {
				camera.aspect = size.width / size.height;
				camera.updateProjectionMatrix();
				context.invalidate();
			}
		},
		render(frame) {
			const { renderer, bufferWidth, bufferHeight } = frame;
			renderer.setScissorTest(false);
			renderer.setViewport(0, 0, bufferWidth, bufferHeight);
			renderer.clear(true, true, true);
			renderer.render(scene, camera);
		},
		dispose() {
			context.canvas.removeEventListener("keydown", handleKeyboard);
			orbitControls.removeEventListener("change", handleOrbitChange);
			orbitControls.dispose();
			disposeScene(scene);
		}
	};
}

function addVectorControls(context, componentControls, key, vectorLabel, getVector, updateScene) {
	for (const componentName of ["x", "y", "z"]) {
		componentControls[key][componentName] = createRangeControl(context.controls, {
			label: `${vectorLabel}[${componentName}]`,
			min: -4,
			max: 4,
			step: 0.25,
			value: getVector()[componentName],
			digits: 2,
			onInput(value) {
				getVector()[componentName] = value;
				updateScene(false);
			}
		});
	}
}

function createBasisDemo(context) {
	context.controls.classList.add("cg-demo__controls--vectors", "cg-demo__controls--basis");
	const environment = createEnvironment(context, { showWorldAxes: false });
	const { scene } = environment;
	const defaultVector = new THREE.Vector3(3, 2, 2);
	const state = { vector: defaultVector.clone() };
	const components = new THREE.Vector3();
	const axis = new THREE.Vector3();
	const componentVectors = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
	const componentLabelPoints = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];

	const basisArrows = AXIS_COLORS.map((color) => makeArrow(color, 0.72));
	const componentArrows = AXIS_COLORS.map((color) => makeArrow(color));
	const vectorArrow = makeArrow(VECTOR_A_COLOR);
	scene.add(...basisArrows, ...componentArrows, vectorArrow);

	const basisLabel = document.createElement("span");
	basisLabel.className = "cg-demo__view-label";
	const legend = makeLegend([
		{ swatch: "a", label: "v" },
		{ swatch: "x", label: "v[x] x̂" },
		{ swatch: "y", label: "v[y] ŷ" },
		{ swatch: "z", label: "v[z] ẑ" }
	]);
	const vectorLabel = makeLabel("v", "cg-demo__vector-label--a");
	const componentLabels = [
		makeLabel("v[x] x̂", "cg-demo__vector-label--x"),
		makeLabel("v[y] ŷ", "cg-demo__vector-label--y"),
		makeLabel("v[z] ẑ", "cg-demo__vector-label--z")
	];
	context.overlay.append(basisLabel, legend, vectorLabel, ...componentLabels);

	const componentControls = { v: {} };
	let vectorMetric;
	let magnitudeMetric;
	let constructionMetric;

	function syncControls() {
		componentControls.v.x.setValue(state.vector.x);
		componentControls.v.y.setValue(state.vector.y);
		componentControls.v.z.setValue(state.vector.z);
	}

	function updateScene(sync = true) {
		components.copy(state.vector);
		const componentValues = [components.x, components.y, components.z];
		const cursor = new THREE.Vector3();

		for (let index = 0; index < 3; index += 1) {
			axis.set(index === 0 ? 1 : 0, index === 1 ? 1 : 0, index === 2 ? 1 : 0);
			setArrow(basisArrows[index], axis.clone().multiplyScalar(1.35));
			componentVectors[index].copy(axis).multiplyScalar(componentValues[index]);
			componentLabelPoints[index].copy(cursor).addScaledVector(componentVectors[index], 0.58);
			setArrow(componentArrows[index], componentVectors[index], cursor);
			cursor.add(componentVectors[index]);
		}

		setArrow(vectorArrow, state.vector);
		basisLabel.textContent = "World basis";
		vectorMetric.textContent = `v = ${formatVector(components)} in this basis`;
		magnitudeMetric.textContent = `|v| = ${formatNumber(state.vector.length())}`;
		constructionMetric.textContent = "v = v[x] x̂ + v[y] ŷ + v[z] ẑ";

		if (sync) {
			syncControls();
		}
		context.invalidate();
	}

	for (const componentName of ["x", "y", "z"]) {
		componentControls.v[componentName] = createRangeControl(context.controls, {
			label: `v[${componentName}]`,
			min: -4,
			max: 4,
			step: 0.25,
			value: defaultVector[componentName],
			digits: 2,
			onInput(value) {
				state.vector[componentName] = value;
				updateScene(false);
			}
		});
	}

	createButton(context.controls, "Reset", () => {
		state.vector.copy(defaultVector);
		environment.resetCamera();
		updateScene(true);
	});

	[vectorMetric, magnitudeMetric, constructionMetric] = makeMetrics(context, ["vector", "magnitude", "construction"]);
	addHelp(context, "Change the coefficients to rebuild v from the three basis directions");
	updateScene(true);

	return {
		resize: (size) => environment.resize(size),
		render(frame) {
			environment.render(frame);
			environment.positionLabel(vectorLabel, state.vector, frame.width, frame.height);
			componentLabels.forEach((label, index) => {
				label.hidden = componentVectors[index].lengthSq() < EPSILON;
				if (!label.hidden) {
					environment.positionLabel(label, componentLabelPoints[index], frame.width, frame.height);
				}
			});
		},
		dispose: () => environment.dispose()
	};
}

function createAdditionDemo(context) {
	context.controls.classList.add("cg-demo__controls--vectors");
	const environment = createEnvironment(context);
	const { scene } = environment;
	const defaultA = new THREE.Vector3(2.5, 1.25, 0.75);
	const defaultB = new THREE.Vector3(-0.5, 2.25, 1.5);
	const state = { a: defaultA.clone(), b: defaultB.clone() };
	const sum = new THREE.Vector3();
	const vectorAArrow = makeArrow(VECTOR_A_COLOR);
	const vectorBArrow = makeArrow(VECTOR_B_COLOR);
	const translatedBArrow = makeArrow(VECTOR_B_COLOR, 0.72);
	const sumArrow = makeArrow(RESULT_COLOR);
	scene.add(vectorAArrow, vectorBArrow, translatedBArrow, sumArrow);

	const parallelogramGeometry = new THREE.BufferGeometry();
	parallelogramGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(12), 3));
	parallelogramGeometry.setIndex([0, 1, 2, 0, 2, 3]);
	const parallelogram = new THREE.Mesh(
		parallelogramGeometry,
		new THREE.MeshBasicMaterial({
			color: RESULT_COLOR,
			transparent: true,
			opacity: 0.1,
			depthWrite: false,
			side: THREE.DoubleSide
		})
	);
	scene.add(parallelogram);

	const legend = makeLegend([
		{ swatch: "a", label: "A" },
		{ swatch: "b", label: "B (translated copy is faded)" },
		{ swatch: "sum", label: "A + B" }
	]);
	const labelA = makeLabel("A", "cg-demo__vector-label--a");
	const labelB = makeLabel("B", "cg-demo__vector-label--b");
	const labelSum = makeLabel("A + B", "cg-demo__vector-label--sum");
	context.overlay.append(legend, labelA, labelB, labelSum);

	let sumMetric;
	let magnitudeMetric;
	const componentControls = { a: {}, b: {} };

	function syncControls() {
		for (const key of ["a", "b"]) {
			for (const componentName of ["x", "y", "z"]) {
				componentControls[key][componentName].setValue(state[key][componentName]);
			}
		}
	}

	function updateScene(sync = true) {
		sum.copy(state.a).add(state.b);
		setArrow(vectorAArrow, state.a);
		setArrow(vectorBArrow, state.b);
		setArrow(translatedBArrow, state.b, state.a);
		setArrow(sumArrow, sum);

		const positions = parallelogramGeometry.attributes.position.array;
		[ORIGIN, state.a, sum, state.b].forEach((point, index) => {
			positions[index * 3] = point.x;
			positions[index * 3 + 1] = point.y;
			positions[index * 3 + 2] = point.z;
		});
		parallelogramGeometry.attributes.position.needsUpdate = true;
		parallelogramGeometry.computeBoundingSphere();
		sumMetric.textContent = `A + B = ${formatVector(sum)}`;
		magnitudeMetric.textContent = `|A + B| = ${formatNumber(sum.length())}`;
		if (sync) {
			syncControls();
		}
		context.invalidate();
	}

	addVectorControls(context, componentControls, "a", "A", () => state.a, updateScene);
	createButton(context.controls, "Reset", () => {
		state.a.copy(defaultA);
		state.b.copy(defaultB);
		environment.resetCamera();
		updateScene(true);
	});
	addVectorControls(context, componentControls, "b", "B", () => state.b, updateScene);
	[sumMetric, magnitudeMetric] = makeMetrics(context, ["sum", "magnitude"]);
	addHelp(context, "Move A and B; the faded copy of B completes the head-to-tail sum");
	updateScene(true);

	return {
		resize: (size) => environment.resize(size),
		render(frame) {
			environment.render(frame);
			environment.positionLabel(labelA, state.a, frame.width, frame.height);
			environment.positionLabel(labelB, state.b, frame.width, frame.height);
			environment.positionLabel(labelSum, sum, frame.width, frame.height);
		},
		dispose: () => environment.dispose()
	};
}

function createDotProductDemo(context) {
	context.controls.classList.add("cg-demo__controls--vectors");
	const environment = createEnvironment(context);
	const { scene } = environment;
	const defaultA = new THREE.Vector3(3, 2, 0.75);
	const defaultB = new THREE.Vector3(-0.75, 2.5, 1.75);
	const state = { a: defaultA.clone(), b: defaultB.clone() };
	const projection = new THREE.Vector3();
	const vectorAArrow = makeArrow(VECTOR_A_COLOR);
	const vectorBArrow = makeArrow(VECTOR_B_COLOR);
	const projectionArrow = makeArrow(PROJECTION_COLOR);
	scene.add(vectorAArrow, vectorBArrow, projectionArrow);

	const residualGeometry = new THREE.BufferGeometry().setFromPoints([ORIGIN, ORIGIN]);
	const residualLine = new THREE.Line(
		residualGeometry,
		new THREE.LineDashedMaterial({ color: PROJECTION_COLOR, dashSize: 0.14, gapSize: 0.09 })
	);
	scene.add(residualLine);
	const angleGeometry = new THREE.BufferGeometry();
	angleGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(29 * 3), 3));
	angleGeometry.setDrawRange(0, 0);
	const angleLine = new THREE.Line(
		angleGeometry,
		new THREE.LineBasicMaterial({ color: 0xf4efe5, transparent: true, opacity: 0.72 })
	);
	scene.add(angleLine);

	const legend = makeLegend([
		{ swatch: "a", label: "A" },
		{ swatch: "b", label: "B" },
		{ swatch: "projection", label: "proj_B(A)" }
	]);
	const labelA = makeLabel("A", "cg-demo__vector-label--a");
	const labelB = makeLabel("B", "cg-demo__vector-label--b");
	const labelProjection = makeLabel("proj_B(A)", "cg-demo__vector-label--projection");
	context.overlay.append(legend, labelA, labelB, labelProjection);

	let dotMetric;
	let angleMetric;
	let relationMetric;
	const componentControls = { a: {}, b: {} };
	const normal = new THREE.Vector3();
	const start = new THREE.Vector3();
	const angleQuaternion = new THREE.Quaternion();

	function syncControls() {
		for (const key of ["a", "b"]) {
			for (const componentName of ["x", "y", "z"]) {
				componentControls[key][componentName].setValue(state[key][componentName]);
			}
		}
	}

	function updateAngleArc(angle) {
		if (!Number.isFinite(angle)) {
			angleLine.visible = false;
			return;
		}
		start.copy(state.a).normalize();
		normal.crossVectors(state.a, state.b);
		if (normal.lengthSq() < EPSILON) {
			normal.crossVectors(start, Math.abs(start.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0));
		}
		normal.normalize();
		const segmentCount = Math.max(8, Math.ceil(28 * angle / Math.PI));
		const positions = angleGeometry.attributes.position.array;
		for (let index = 0; index <= segmentCount; index += 1) {
			angleQuaternion.setFromAxisAngle(normal, angle * index / segmentCount);
			const point = start.clone().applyQuaternion(angleQuaternion).multiplyScalar(1.05);
			positions[index * 3] = point.x;
			positions[index * 3 + 1] = point.y;
			positions[index * 3 + 2] = point.z;
		}
		angleGeometry.attributes.position.needsUpdate = true;
		angleGeometry.setDrawRange(0, segmentCount + 1);
		angleGeometry.computeBoundingSphere();
		angleLine.visible = true;
	}

	function updateScene(sync = true) {
		const lengthA = state.a.length();
		const lengthB = state.b.length();
		const dot = state.a.dot(state.b);
		const denominator = lengthA * lengthB;
		const angle = denominator > EPSILON
			? Math.acos(THREE.MathUtils.clamp(dot / denominator, -1, 1))
			: NaN;

		setArrow(vectorAArrow, state.a);
		setArrow(vectorBArrow, state.b);
		if (state.b.lengthSq() > EPSILON) {
			projection.copy(state.b).multiplyScalar(dot / state.b.lengthSq());
		} else {
			projection.set(0, 0, 0);
		}
		setArrow(projectionArrow, projection);

		const residualPositions = residualGeometry.attributes.position.array;
		residualPositions[0] = projection.x;
		residualPositions[1] = projection.y;
		residualPositions[2] = projection.z;
		residualPositions[3] = state.a.x;
		residualPositions[4] = state.a.y;
		residualPositions[5] = state.a.z;
		residualGeometry.attributes.position.needsUpdate = true;
		residualGeometry.computeBoundingSphere();
		residualLine.computeLineDistances();
		residualLine.visible = state.b.lengthSq() > EPSILON;
		updateAngleArc(angle);

		const relation = !Number.isFinite(angle)
			? "undefined (one vector is zero)"
			: Math.abs(dot) < 0.005
				? "perpendicular"
				: dot > 0 ? "pointing generally together" : "pointing generally apart";
		dotMetric.textContent = `A · B = ${formatNumber(dot)}`;
		angleMetric.textContent = `angle = ${Number.isFinite(angle) ? `${THREE.MathUtils.radToDeg(angle).toFixed(1)}°` : "undefined"}`;
		relationMetric.textContent = relation;
		if (sync) {
			syncControls();
		}
		context.invalidate();
	}

	addVectorControls(context, componentControls, "a", "A", () => state.a, updateScene);
	createButton(context.controls, "Reset", () => {
		state.a.copy(defaultA);
		state.b.copy(defaultB);
		environment.resetCamera();
		updateScene(true);
	});
	addVectorControls(context, componentControls, "b", "B", () => state.b, updateScene);
	[dotMetric, angleMetric, relationMetric] = makeMetrics(context, ["dot", "angle", "relation"]);
	addHelp(context, "Change A and B to compare alignment, angle, and projection");
	updateScene(true);

	return {
		resize: (size) => environment.resize(size),
		render(frame) {
			environment.render(frame);
			environment.positionLabel(labelA, state.a, frame.width, frame.height);
			environment.positionLabel(labelB, state.b, frame.width, frame.height);
			labelProjection.hidden = projection.lengthSq() < EPSILON;
			if (!labelProjection.hidden) {
				environment.positionLabel(labelProjection, projection, frame.width, frame.height);
			}
		},
		dispose: () => environment.dispose()
	};
}

const DEMOS = new Map([
	["vector-from-basis", createBasisDemo],
	["vector-addition", createAdditionDemo],
	["vector-dot-product", createDotProductDemo]
]);

export function createDemo(context) {
	const name = context.host.getAttribute("demo");
	const create = DEMOS.get(name);
	if (!create) {
		throw new Error(`Unknown vector foundations demo: ${name}`);
	}
	return create(context);
}
