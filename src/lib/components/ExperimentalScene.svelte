<script lang="ts">
	import * as THREE from 'three';
	import { T, useTask, useThrelte } from '@threlte/core';
	import { OrbitControls } from '@threlte/extras';
	import { Octree, Box, Point } from '$lib/simulation/Octree';

	const { renderer } = useThrelte();
	$effect(() => {
		if (renderer && 'setClearColor' in renderer) renderer.setClearColor(0x000000);
	});

	let {
		floatingIcons = [],
		backgroundImageUrl = '/rfuMwcFyzT8AwB18yvQA1_ZSXIOYYD.png',
		// Simulation Props with Defaults
		boundsSize = 40,
		maxSpeed = 0.2,
		separationFactor = 0.2,
		alignFactor = 0.05,
		cohesionFactor = 0.05
	}: {
		floatingIcons?: { emoji: string; key: string }[];
		backgroundImageUrl?: string;
		boundsSize?: number;
		maxSpeed?: number;
		separationFactor?: number;
		alignFactor?: number;
		cohesionFactor?: number;
	} = $props();

	// Constants that don't need UI control yet
	const VISUAL_RANGE = 10;
	const PROTECTED_RANGE = 2.5;
	const CENTERING_FACTOR = 0.005;
	const MIN_SPEED = 0.1;

	// Texture Cache
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

	// --- Boid State ---
	class Boid {
		position: THREE.Vector3;
		velocity: THREE.Vector3;
		emoji: string;
		key: string;
		ref: THREE.Sprite | undefined = undefined; // Direct reference to the 3D object

		constructor(emoji: string, key: string) {
			this.emoji = emoji;
			this.key = key;
			this.position = new THREE.Vector3(
				(Math.random() - 0.5) * boundsSize,
				(Math.random() - 0.5) * boundsSize,
				(Math.random() - 0.5) * boundsSize
			);
			this.velocity = new THREE.Vector3(
				Math.random() - 0.5,
				Math.random() - 0.5,
				Math.random() - 0.5
			)
				.normalize()
				.multiplyScalar(maxSpeed);
		}

		update(octree: Octree) {
			const range = new Box(
				this.position.x,
				this.position.y,
				this.position.z,
				VISUAL_RANGE / 2,
				VISUAL_RANGE / 2,
				VISUAL_RANGE / 2
			);
			const neighbors = octree
				.query(range)
				.map((p) => p.userData as Boid)
				.filter((b) => b !== this);

			let closeDx = 0,
				closeDy = 0,
				closeDz = 0;
			let xVelAvg = 0,
				yVelAvg = 0,
				zVelAvg = 0;
			let xPosAvg = 0,
				yPosAvg = 0,
				zPosAvg = 0;
			let neighboringCount = 0;

			for (const other of neighbors) {
				const distSq = this.position.distanceToSquared(other.position);

				if (distSq < PROTECTED_RANGE * PROTECTED_RANGE) {
					closeDx += this.position.x - other.position.x;
					closeDy += this.position.y - other.position.y;
					closeDz += this.position.z - other.position.z;
				}

				if (other.key === this.key && distSq < VISUAL_RANGE * VISUAL_RANGE) {
					xVelAvg += other.velocity.x;
					yVelAvg += other.velocity.y;
					zVelAvg += other.velocity.z;
					xPosAvg += other.position.x;
					yPosAvg += other.position.y;
					zPosAvg += other.position.z;
					neighboringCount++;
				}
			}

			// Use props for forces
			this.velocity.x += closeDx * separationFactor;
			this.velocity.y += closeDy * separationFactor;
			this.velocity.z += closeDz * separationFactor;

			if (neighboringCount > 0) {
				xVelAvg /= neighboringCount;
				yVelAvg /= neighboringCount;
				zVelAvg /= neighboringCount;
				this.velocity.x += (xVelAvg - this.velocity.x) * alignFactor;
				this.velocity.y += (yVelAvg - this.velocity.y) * alignFactor;
				this.velocity.z += (zVelAvg - this.velocity.z) * alignFactor;

				xPosAvg /= neighboringCount;
				yPosAvg /= neighboringCount;
				zPosAvg /= neighboringCount;
				this.velocity.x += (xPosAvg - this.position.x) * cohesionFactor;
				this.velocity.y += (yPosAvg - this.position.y) * cohesionFactor;
				this.velocity.z += (zPosAvg - this.position.z) * cohesionFactor;
			}

			// Soft bounds with prop
			const distFromCenter = this.position.length();
			if (distFromCenter > boundsSize * 0.8) {
				this.velocity.sub(this.position.clone().multiplyScalar(CENTERING_FACTOR));
			}

			// Limit Speed with prop
			const speed = this.velocity.length();
			if (speed > maxSpeed) {
				this.velocity.multiplyScalar(maxSpeed / speed);
			} else if (speed < MIN_SPEED) {
				this.velocity.multiplyScalar(MIN_SPEED / speed);
			}

			this.position.add(this.velocity);

			if (this.ref) {
				this.ref.position.copy(this.position);
			}
		}
	}

	let boids = $state<Boid[]>([]);

	$effect(() => {
		if (typeof document === 'undefined') return;
		// Re-init boids when icons change
		// Note: We don't re-init on prop change to avoid resetting positions constantly,
		// but the update loop will pick up new prop values automatically from the closure scope if we access them directly or pass them.
		// However, the class methods capture values. To make it dynamic, we should pass props to update().
		boids = floatingIcons.map((icon) => new Boid(icon.emoji, icon.key));
	});

	useTask(() => {
		if (boids.length === 0) return;

		// Use dynamic bounds size for octree
		const octree = new Octree(new Box(0, 0, 0, boundsSize, boundsSize, boundsSize), 4);

		for (const boid of boids) {
			octree.insert(new Point(boid.position.x, boid.position.y, boid.position.z, boid));
		}

		for (const boid of boids) {
			boid.update(octree);
		}
	});
</script>

<T.PerspectiveCamera makeDefault position={[0, 0, 60]} fov={50}>
	<OrbitControls enableDamping dampingFactor={0.05} autoRotate autoRotateSpeed={0.5} />
</T.PerspectiveCamera>

{#each boids as boid (boid)}
	<T.Sprite
		position={[boid.position.x, boid.position.y, boid.position.z]}
		scale={[3, 3, 3]}
		bind:ref={boid.ref}
	>
		<T.SpriteMaterial map={getEmojiTexture(boid.emoji)} transparent={true} />
	</T.Sprite>
{/each}
