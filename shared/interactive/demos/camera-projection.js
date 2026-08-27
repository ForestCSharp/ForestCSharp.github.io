import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createButton, createRangeControl } from "../controls.js?v=20260826u";

const DEFAULTS = {
	fov: 55,
	near: 1,
	far: 14,
	objectDepth: 8
};

const CAMERA_ASPECT = 16 / 10;
const MIN_PLANE_GAP = 0.5;
const DEFAULT_OBSERVER_OFFSET = new THREE.Vector3(18, 13, 22);

function setLayer(object, layer) {
	object.traverse((child) => child.layers.set(layer));
}

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

export function createDemo(context) {
	const scene = new THREE.Scene();
	const worldBackground = new THREE.Color(0x0a0f10);
	const insetBackground = new THREE.Color(0x151d20);
	const projectionTarget = new THREE.Vector3(0, 0.8, 0);
	const frustumCenter = new THREE.Vector3();
	const forward = new THREE.Vector3();
	const planePosition = new THREE.Vector3();
	const observerOffset = new THREE.Vector3();

	scene.background = worldBackground;
	scene.fog = new THREE.Fog(0x0a0f10, 20, 42);

	const projectionCamera = new THREE.PerspectiveCamera(
		DEFAULTS.fov,
		CAMERA_ASPECT,
		DEFAULTS.near,
		DEFAULTS.far
	);
	projectionCamera.position.set(0, 1.7, 8);
	projectionCamera.lookAt(projectionTarget);
	projectionCamera.updateMatrixWorld(true);
	projectionCamera.getWorldDirection(forward);
	frustumCenter.copy(projectionCamera.position)
		.addScaledVector(forward, (DEFAULTS.near + DEFAULTS.far) * 0.5);
	projectionCamera.layers.set(0);

	const observerCamera = new THREE.PerspectiveCamera(42, CAMERA_ASPECT, 0.1, 100);
	observerCamera.position.copy(frustumCenter).add(DEFAULT_OBSERVER_OFFSET);
	observerCamera.lookAt(frustumCenter);
	observerCamera.layers.enable(1);

	const orbitControls = new OrbitControls(observerCamera, context.canvas);
	orbitControls.target.copy(frustumCenter);
	orbitControls.enableDamping = false;
	orbitControls.enablePan = false;
	orbitControls.minDistance = 7;
	orbitControls.maxDistance = 50;
	orbitControls.addEventListener("change", context.invalidate);

	const ambient = new THREE.HemisphereLight(0xbfd8ff, 0x16231e, 2.1);
	scene.add(ambient);

	const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
	keyLight.position.set(7, 11, 6);
	scene.add(keyLight);

	const grid = new THREE.GridHelper(30, 30, 0x6ee7a8, 0x263b35);
	grid.position.y = -0.02;
	scene.add(grid);

	const stageMaterial = new THREE.MeshStandardMaterial({
		color: 0x8eb7ff,
		roughness: 0.48,
		metalness: 0.08
	});
	const warmMaterial = new THREE.MeshStandardMaterial({
		color: 0xff9d69,
		roughness: 0.42,
		metalness: 0.06
	});
	const greenMaterial = new THREE.MeshStandardMaterial({
		color: 0x6ee7a8,
		roughness: 0.38,
		metalness: 0.08
	});

	const cube = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.7, 1.7), stageMaterial);
	cube.position.set(-2.5, 0.85, -1.8);
	cube.rotation.set(0.18, 0.52, 0.08);
	scene.add(cube);

	const torus = new THREE.Mesh(new THREE.TorusKnotGeometry(0.9, 0.28, 96, 12), warmMaterial);
	torus.position.set(2.25, 1.2, -4.3);
	torus.rotation.set(0.35, -0.25, 0.18);
	scene.add(torus);

	const column = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.95, 2.7, 24), greenMaterial);
	column.position.set(0.25, 1.35, -7.6);
	scene.add(column);

	const movingObject = new THREE.Mesh(
		new THREE.SphereGeometry(0.72, 32, 20),
		new THREE.MeshStandardMaterial({ color: 0xf6d365, roughness: 0.32, metalness: 0.16 })
	);
	scene.add(movingObject);

	const cameraHelper = new THREE.CameraHelper(projectionCamera);
	setLayer(cameraHelper, 1);
	scene.add(cameraHelper);

	const nearPlane = new THREE.Mesh(
		new THREE.PlaneGeometry(1, 1),
		new THREE.MeshBasicMaterial({
			color: 0x6ee7a8,
			transparent: true,
			opacity: 0.13,
			depthWrite: false,
			side: THREE.DoubleSide
		})
	);
	const farPlane = new THREE.Mesh(
		new THREE.PlaneGeometry(1, 1),
		new THREE.MeshBasicMaterial({
			color: 0xff9d69,
			transparent: true,
			opacity: 0.08,
			depthWrite: false,
			side: THREE.DoubleSide
		})
	);
	setLayer(nearPlane, 1);
	setLayer(farPlane, 1);
	nearPlane.renderOrder = 2;
	farPlane.renderOrder = 1;
	scene.add(nearPlane, farPlane);

	const worldLabel = document.createElement("span");
	worldLabel.className = "cg-demo__view-label";
	worldLabel.textContent = "World view";

	const insetFrame = document.createElement("div");
	insetFrame.className = "cg-demo__inset-frame";
	const insetLabel = document.createElement("span");
	insetLabel.className = "cg-demo__view-label cg-demo__view-label--inset";
	insetLabel.textContent = "Camera output";
	insetFrame.append(insetLabel);
	context.overlay.append(worldLabel, insetFrame);

	const state = { ...DEFAULTS };

	function updatePlane(mesh, distance) {
		const height = 2 * Math.tan(THREE.MathUtils.degToRad(state.fov) * 0.5) * distance;
		const width = height * CAMERA_ASPECT;
		planePosition.copy(projectionCamera.position).addScaledVector(forward, distance);
		mesh.position.copy(planePosition);
		mesh.quaternion.copy(projectionCamera.quaternion);
		mesh.scale.set(width, height, 1);
	}

	function updateProjection() {
		observerOffset.subVectors(observerCamera.position, orbitControls.target);
		projectionCamera.fov = state.fov;
		projectionCamera.near = state.near;
		projectionCamera.far = state.far;
		projectionCamera.aspect = CAMERA_ASPECT;
		projectionCamera.updateProjectionMatrix();
		projectionCamera.updateMatrixWorld(true);

		projectionCamera.getWorldDirection(forward);
		frustumCenter.copy(projectionCamera.position)
			.addScaledVector(forward, (state.near + state.far) * 0.5);
		orbitControls.target.copy(frustumCenter);
		observerCamera.position.copy(frustumCenter).add(observerOffset);
		observerCamera.lookAt(frustumCenter);
		orbitControls.update();
		movingObject.position.copy(projectionCamera.position).addScaledVector(forward, state.objectDepth);
		updatePlane(nearPlane, state.near);
		updatePlane(farPlane, state.far);
		cameraHelper.update();
		context.invalidate();
	}

	const fovControl = createRangeControl(context.controls, {
		label: "Vertical FOV",
		min: 20,
		max: 100,
		step: 1,
		value: state.fov,
		digits: 0,
		unit: "°",
		onInput(value) {
			state.fov = value;
			updateProjection();
		}
	});

	const nearControl = createRangeControl(context.controls, {
		label: "Near plane",
		min: 0.25,
		max: 8,
		step: 0.25,
		value: state.near,
		digits: 2,
		onInput(value) {
			state.near = value;
			if (state.near > state.far - MIN_PLANE_GAP) {
				state.far = state.near + MIN_PLANE_GAP;
				farControl.setValue(state.far);
			}
			updateProjection();
		}
	});

	const farControl = createRangeControl(context.controls, {
		label: "Far plane",
		min: 2,
		max: 25,
		step: 0.5,
		value: state.far,
		digits: 1,
		onInput(value) {
			state.far = value;
			if (state.far < state.near + MIN_PLANE_GAP) {
				state.near = state.far - MIN_PLANE_GAP;
				nearControl.setValue(state.near);
			}
			updateProjection();
		}
	});

	const depthControl = createRangeControl(context.controls, {
		label: "Object depth",
		min: 0.25,
		max: 30,
		step: 0.25,
		value: state.objectDepth,
		digits: 2,
		onInput(value) {
			state.objectDepth = value;
			updateProjection();
		}
	});

	function reset() {
		Object.assign(state, DEFAULTS);
		fovControl.setValue(state.fov);
		nearControl.setValue(state.near);
		farControl.setValue(state.far);
		depthControl.setValue(state.objectDepth);
		updateProjection();
		observerCamera.position.copy(frustumCenter).add(DEFAULT_OBSERVER_OFFSET);
		orbitControls.target.copy(frustumCenter);
		observerCamera.lookAt(frustumCenter);
		orbitControls.update();
	}

	createButton(context.controls, "Reset", reset);

	const help = document.createElement("p");
	help.className = "cg-demo__help";
	help.id = `cg-demo-help-${Math.random().toString(36).slice(2)}`;
	help.textContent = "Drag to orbit · Scroll or pinch to zoom · Arrow keys orbit when the canvas is focused";
	context.controls.append(help);
	context.canvas.setAttribute("aria-describedby", help.id);

	function handleKeyboard(event) {
		const spherical = new THREE.Spherical().setFromVector3(
			observerCamera.position.clone().sub(orbitControls.target)
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
		observerCamera.position.copy(orbitControls.target).add(new THREE.Vector3().setFromSpherical(spherical));
		observerCamera.lookAt(orbitControls.target);
		orbitControls.update();
		context.invalidate();
	}

	context.canvas.addEventListener("keydown", handleKeyboard);
	updateProjection();

	return {
		resize(size) {
			if (size.width > 0 && size.height > 0) {
				observerCamera.aspect = size.width / size.height;
				observerCamera.updateProjectionMatrix();
				context.invalidate();
			}
		},

		render(frame) {
			const { renderer, bufferWidth, bufferHeight } = frame;
			const insetWidth = Math.round(bufferWidth * 0.38);
			const insetHeight = Math.round(insetWidth / CAMERA_ASPECT);
			const insetRight = Math.round(bufferWidth * 0.03);
			const insetTop = Math.round(bufferHeight * 0.04);
			const insetX = bufferWidth - insetRight - insetWidth;
			const insetY = bufferHeight - insetTop - insetHeight;

			scene.background = worldBackground;
			renderer.setScissorTest(false);
			renderer.setViewport(0, 0, bufferWidth, bufferHeight);
			renderer.clear(true, true, true);
			renderer.render(scene, observerCamera);

			scene.background = insetBackground;
			renderer.setScissorTest(true);
			renderer.setScissor(insetX, insetY, insetWidth, insetHeight);
			renderer.setViewport(insetX, insetY, insetWidth, insetHeight);
			renderer.clear(true, true, true);
			renderer.render(scene, projectionCamera);
			renderer.setScissorTest(false);
			scene.background = worldBackground;
		},

		dispose() {
			context.canvas.removeEventListener("keydown", handleKeyboard);
			orbitControls.removeEventListener("change", context.invalidate);
			orbitControls.dispose();
			disposeScene(scene);
		}
	};
}
