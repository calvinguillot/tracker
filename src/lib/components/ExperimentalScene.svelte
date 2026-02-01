<script lang="ts">
	import * as THREE from 'three';
	import { base } from '$app/paths';
	import { T, useTask, useThrelte } from '@threlte/core';
	import { BloomEffect } from 'threlte-postprocessing/effects';
	import { EffectComposer } from 'threlte-postprocessing';
	import { OrbitControls, GLTF } from '@threlte/extras';

	const { renderer } = useThrelte();
	$effect(() => {
		if (renderer && 'setClearColor' in renderer) renderer.setClearColor(0x000000);
	});

	const modelUrl = $derived.by(() => {
		const prefix = `${base || ''}/models`;
		const m = latestMood;
		if (m == null || m >= 8) return `${prefix}/model_jumping.glb`;
		if (m >= 4) return `${prefix}/model_laying.glb`;
		return `${prefix}/model_sad.glb`;
	});

	// Group flocking: cohesion + separation within group, group target drifts with noise
	const BOUNDS = 3.2;
	const MAX_SPEED = 0.18;
	const MIN_SPEED = 0.02;
	const SEPARATION_FACTOR = 0.28;
	const COHESION_FACTOR = 0.06;
	const NOISE_STRENGTH = 0.025;
	const GROUP_TARGET_RADIUS = 2.2;
	const GROUP_DRIFT_SPEED = 0.25;
	const CENTERING_FACTOR = 0.03;
	const PROTECTED_RANGE = 0.35;

	let {
		iconGroups = [],
		latestMood = null,
		onModelLoaded = () => {},
		onModelError = () => {}
	}: {
		iconGroups?: { key: string; emoji: string; count: number }[];
		latestMood?: number | null;
		onModelLoaded?: () => void;
		onModelError?: (err: Error) => void;
	} = $props();

	function handleLoad() {
		onModelLoaded();
	}
	function handleError(error: Error) {
		onModelError(error);
	}

	// Emoji texture cache
	const emojiTextures = new Map<string, THREE.CanvasTexture>();
	function getEmojiTexture(emoji: string) {
		if (emojiTextures.has(emoji)) return emojiTextures.get(emoji)!;
		const canvas = document.createElement('canvas');
		canvas.width = 128;
		canvas.height = 128;
		const ctx = canvas.getContext('2d')!;
		ctx.font = '90px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(emoji, 64, 70);
		const tex = new THREE.CanvasTexture(canvas);
		tex.colorSpace = THREE.SRGBColorSpace;
		emojiTextures.set(emoji, tex);
		return tex;
	}

	// Flat list of slots: { emoji, groupIndex }; order matches slotState
	let iconSlots = $derived.by(() => {
		const slots: { emoji: string; groupIndex: number }[] = [];
		iconGroups.forEach((group, groupIndex) => {
			for (let i = 0; i < group.count; i++) {
				slots.push({ emoji: group.emoji, groupIndex });
			}
		});
		return slots;
	});

	// Indices per group (for separation/cohesion within group)
	let indicesByGroup = $derived.by(() => {
		const map = new Map<number, number[]>();
		iconSlots.forEach((slot, i) => {
			const list = map.get(slot.groupIndex) ?? [];
			list.push(i);
			map.set(slot.groupIndex, list);
		});
		return map;
	});

	function getGroupTargets(t: number): { x: number; y: number; z: number }[] {
		const speed = t * GROUP_DRIFT_SPEED;
		return iconGroups.map((_, gi) => {
			const phase = gi * 1.7;
			const x =
				GROUP_TARGET_RADIUS *
				(Math.sin(speed + phase) * 0.6 + Math.sin(speed * 0.7 + phase * 2) * 0.4);
			const z =
				GROUP_TARGET_RADIUS *
				(Math.cos(speed + phase * 0.9) * 0.6 + Math.cos(speed * 0.8 + phase) * 0.4);
			const y = 0.4 * Math.sin(speed * 0.5 + phase * 1.3);
			return { x, y, z };
		});
	}

	type SlotState = { x: number; y: number; z: number; vx: number; vy: number; vz: number };
	let slotState = $state<SlotState[]>([]);
	let simTime = $state(0);

	// Init or reset slotState when iconSlots change (static positions per group, no time dependency)
	$effect(() => {
		const slots = iconSlots;
		const n = slots.length;
		const numGroups = iconGroups.length;
		if (n === 0) {
			slotState = [];
			return;
		}
		const newState: SlotState[] = [];
		slots.forEach((slot, i) => {
			const g = slot.groupIndex;
			const angle = (g / Math.max(numGroups, 1)) * Math.PI * 2;
			const jitter = 0.2;
			newState.push({
				x: GROUP_TARGET_RADIUS * Math.cos(angle) + (Math.random() - 0.5) * jitter,
				y: (Math.random() - 0.5) * jitter,
				z: GROUP_TARGET_RADIUS * Math.sin(angle) + (Math.random() - 0.5) * jitter,
				vx: (Math.random() - 0.5) * 0.04,
				vy: (Math.random() - 0.5) * 0.04,
				vz: (Math.random() - 0.5) * 0.04
			});
		});
		slotState = newState;
	});

	useTask((delta: number) => {
		const slots = iconSlots;
		const n = slots.length;
		if (n === 0 || slotState.length !== n) return;
		simTime += delta;
		const targets = getGroupTargets(simTime);
		const byGroup = indicesByGroup;
		const dt = Math.min(delta, 0.05);

		const next: SlotState[] = slotState.map((s) => ({ ...s }));

		for (let i = 0; i < n; i++) {
			const slot = slots[i];
			const g = slot.groupIndex;
			const pos = { x: next[i].x, y: next[i].y, z: next[i].z };
			let vx = next[i].vx;
			let vy = next[i].vy;
			let vz = next[i].vz;

			// Cohesion: steer towards group target (drift center)
			const t = targets[g];
			if (t) {
				vx += (t.x - pos.x) * COHESION_FACTOR;
				vy += (t.y - pos.y) * COHESION_FACTOR;
				vz += (t.z - pos.z) * COHESION_FACTOR;
			}

			// Separation from same-group icons
			const sameGroup = byGroup.get(g) ?? [];
			let sepX = 0,
				sepY = 0,
				sepZ = 0;
			for (const j of sameGroup) {
				if (j === i) continue;
				const other = next[j];
				const dx = pos.x - other.x;
				const dy = pos.y - other.y;
				const dz = pos.z - other.z;
				const dSq = dx * dx + dy * dy + dz * dz;
				if (dSq > 0 && dSq < PROTECTED_RANGE * PROTECTED_RANGE) {
					const d = Math.sqrt(dSq);
					const f = (1 - d / PROTECTED_RANGE) / d;
					sepX += dx * f;
					sepY += dy * f;
					sepZ += dz * f;
				}
			}
			vx += sepX * SEPARATION_FACTOR;
			vy += sepY * SEPARATION_FACTOR;
			vz += sepZ * SEPARATION_FACTOR;

			// Noise (random nudge)
			vx += (Math.random() - 0.5) * NOISE_STRENGTH;
			vy += (Math.random() - 0.5) * NOISE_STRENGTH;
			vz += (Math.random() - 0.5) * NOISE_STRENGTH;

			// Soft bounds: pull back towards origin
			const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
			if (dist > BOUNDS * 0.85) {
				const scale = CENTERING_FACTOR / (dist + 1e-6);
				vx -= pos.x * scale;
				vy -= pos.y * scale;
				vz -= pos.z * scale;
			}

			// Clamp speed
			const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
			if (speed > MAX_SPEED) {
				const f = MAX_SPEED / speed;
				vx *= f;
				vy *= f;
				vz *= f;
			} else if (speed < MIN_SPEED && speed > 0) {
				const f = MIN_SPEED / speed;
				vx *= f;
				vy *= f;
				vz *= f;
			}

			next[i].vx = vx;
			next[i].vy = vy;
			next[i].vz = vz;
			next[i].x = pos.x + vx * dt;
			next[i].y = pos.y + vy * dt;
			next[i].z = pos.z + vz * dt;
		}

		slotState = next;
	});
</script>

<T.PerspectiveCamera makeDefault position={[0, 2, 3]} fov={50}>
	<OrbitControls enableDamping dampingFactor={0.05} autoRotate autoRotateSpeed={0.5} />
</T.PerspectiveCamera>

<!-- Lights -->
<T.AmbientLight intensity={0.6} />
<T.DirectionalLight position={[5, 5, 5]} intensity={1} castShadow />

<!-- Centered GLB model (in main scene so bloom sees it) -->
<GLTF url={modelUrl} position={[0, -1, 0]} onload={handleLoad} onerror={handleError} />

<!-- Icons: grouped by type, moving in clusters with cohesion + separation + noise -->
{#each iconSlots as slot, i (i)}
	{#if slotState[i]}
		<T.Sprite position={[slotState[i].x, slotState[i].y, slotState[i].z]} scale={[0.4, 0.4, 0.4]}>
			<T.SpriteMaterial map={getEmojiTexture(slot.emoji)} transparent={true} />
		</T.Sprite>
	{/if}
{/each}

<EffectComposer>
	<BloomEffect
		luminanceThreshold={0.2}
		luminanceSmoothing={0.25}
		height={480}
		radius={0.4}
		intensity={2}
	/>
</EffectComposer>
