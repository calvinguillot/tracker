<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import type { Session } from '@supabase/supabase-js';
	import { Canvas } from '@threlte/core';
	import ExperimentalScene from '$lib/components/ExperimentalScene.svelte';

	const MIN_SIZE = 100;

	let session = $state<Session | null>(null);
	let containerRef: HTMLDivElement | undefined = $state();
	let canvasReady = $state(false);
	let modelLoaded = $state(false);
	let canvasSize = $state<{ width: number; height: number } | null>(null);

	function updateCanvasSize() {
		if (!containerRef) return;
		const w = containerRef.clientWidth;
		const h = containerRef.clientHeight;
		if (w >= MIN_SIZE && h >= MIN_SIZE) {
			canvasSize = { width: w, height: h };
			if (!canvasReady) canvasReady = true;
		}
	}

	$effect(() => {
		const el = containerRef;
		if (!el) return;
		const ro = new ResizeObserver(() => updateCanvasSize());
		ro.observe(el);
		return () => ro.disconnect();
	});

	// --- Simulation (commented out): data, stats, controls, month toggle ---
	// const backgroundImageUrl = `${base || ''}/rfuMwcFyzT8AwB18yvQA1_ZSXIOYYD.png`;
	// let rawData = $state<any[]>([]);
	// let eventsCurrentMonthOnly = $state(false);
	// let showControls = $state(false);
	// let maxSpeed = $state(0.2);
	// let separationFactor = $state(0.2);
	// let alignFactor = $state(0.05);
	// let cohesionFactor = $state(0.05);
	// let boundsSize = $state(40);
	// let parsedData = $derived(...);
	// let startDate = $state(''); let endDate = $state('');
	// let filteredData = $derived.by(...);
	// let activityStats = $derived.by(...);
	// const demoIcons = [...]; let floatingIcons = $derived.by(...);

	onMount(() => {
		supabase.auth.getSession().then(({ data: { session: s } }) => {
			session = s;
			// if (s) fetchData();
		});

		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_event, _session) => {
			session = _session;
			// if (_session) fetchData();
		});

		// Defer Canvas until container has real size; use explicit pixel size so WebGL viewport matches from frame 1
		const checkSize = () => {
			if (
				containerRef &&
				containerRef.clientWidth >= MIN_SIZE &&
				containerRef.clientHeight >= MIN_SIZE
			) {
				requestAnimationFrame(() => updateCanvasSize());
				return true;
			}
			requestAnimationFrame(checkSize);
		};
		requestAnimationFrame(checkSize);

		return () => subscription.unsubscribe();
	});

	// async function fetchData() { ... }
</script>

<svelte:head>
	<title>Experimental | CG Tracker 2026</title>
</svelte:head>

{#if session}
	<div class="experimental-container" bind:this={containerRef}>
		{#if canvasReady && canvasSize}
			<div
				class="canvas-wrapper"
				style="width: {canvasSize.width}px; height: {canvasSize.height}px;"
			>
				<Canvas>
					<ExperimentalScene
						onModelLoaded={() => (modelLoaded = true)}
						onModelError={() => (modelLoaded = true)}
					/>
				</Canvas>
			</div>
		{/if}
		{#if !modelLoaded}
			<div class="loader-overlay" aria-hidden="true">
				<div class="loader-content">
					<div class="loader-spinner"></div>
					<p class="loader-text">Loading model…</p>
				</div>
			</div>
		{/if}
	</div>
{:else}
	<div class="flex min-h-[50vh] items-center justify-center text-zinc-400">
		<p>Please log in to view the experimental page.</p>
	</div>
{/if}

<style>
	.experimental-container {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100vh;
		min-width: 100vw;
		min-height: 100vh;
		background-color: black;
	}

	.canvas-wrapper {
		position: absolute;
		inset: 0;
		overflow: hidden;
	}

	/* Ensure Threlte canvas wrapper and canvas fill the wrapper so WebGL viewport matches */
	:global(.canvas-wrapper > div),
	:global(.canvas-wrapper canvas) {
		width: 100%;
		height: 100%;
	}

	.loader-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: rgba(0, 0, 0, 0.85);
		z-index: 10;
	}

	.loader-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.loader-spinner {
		width: 40px;
		height: 40px;
		border: 3px solid rgb(63 63 70);
		border-top-color: rgb(129 140 248);
		border-radius: 50%;
		animation: loader-spin 0.8s linear infinite;
	}

	.loader-text {
		color: rgb(161 161 170);
		font-size: 0.875rem;
		margin: 0;
	}

	@keyframes loader-spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
