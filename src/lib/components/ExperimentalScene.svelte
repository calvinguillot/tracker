<script lang="ts">
	import { base } from '$app/paths';
	import { T, useThrelte } from '@threlte/core';
	import {
		DepthOfFieldEffect,
		BloomEffect,
		VignetteEffect,
		ChromaticAberrationEffect
	} from 'threlte-postprocessing/effects';
	import { EffectComposer } from 'threlte-postprocessing';
	import { OrbitControls, GLTF } from '@threlte/extras';

	const { renderer } = useThrelte();
	$effect(() => {
		if (renderer && 'setClearColor' in renderer) renderer.setClearColor(0x000000);
	});

	const modelUrl = `${base || ''}/model_jumping.glb`;

	let {
		onModelLoaded = () => {},
		onModelError = () => {}
	}: {
		onModelLoaded?: () => void;
		onModelError?: (err: Error) => void;
	} = $props();

	function handleLoad() {
		onModelLoaded();
	}
	function handleError(error: Error) {
		onModelError(error);
	}

	// --- Simulation (commented out): boids, octree, emoji sprites ---
	// import * as THREE from 'three';
	// import { useTask } from '@threlte/core';
	// import { Octree, Box, Point } from '$lib/simulation/Octree';
	// let { floatingIcons, backgroundImageUrl, boundsSize, maxSpeed, separationFactor, alignFactor, cohesionFactor } = $props();
	// const VISUAL_RANGE = 10; const PROTECTED_RANGE = 2.5; const CENTERING_FACTOR = 0.005; const MIN_SPEED = 0.1;
	// const emojiTextures = new Map<string, THREE.CanvasTexture>(); function getEmojiTexture(emoji: string) { ... }
	// class Boid { ... }
	// let boids = $state<Boid[]>([]);
	// $effect(() => { boids = floatingIcons.map((icon) => new Boid(icon.emoji, icon.key)); });
	// useTask(() => { ... });
</script>

<T.PerspectiveCamera makeDefault position={[0, 2, 3]} fov={50}>
	<OrbitControls enableDamping dampingFactor={0.05} autoRotate autoRotateSpeed={0.5} />
</T.PerspectiveCamera>

<!-- Lights so the model is visible -->
<T.AmbientLight intensity={0.6} />
<T.DirectionalLight position={[5, 5, 5]} intensity={1} castShadow />

<EffectComposer>
	<BloomEffect
		luminanceThreshold={0.2}
		luminanceSmoothing={0.25}
		height={480}
		radius={0.4}
		intensity={4}
	/>

	<!-- Centered GLB model -->
	<GLTF url={modelUrl} position={[0, -1, 0]} onload={handleLoad} onerror={handleError} />
</EffectComposer>
