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

	// Data for orbiting icons (grouped by activity type)
	let rawData = $state<any[]>([]);

	let parsedData = $derived(
		rawData
			.map((d: any) => ({
				...d,
				created_at: new Date(d.created_at)
			}))
			.sort((a: any, b: any) => a.created_at.getTime() - b.created_at.getTime())
	);

	let startDate = $state('');
	let endDate = $state('');

	let filteredData = $derived.by(() => {
		let d = parsedData;
		if (startDate) {
			const [y, m, d_part] = startDate.split('-').map(Number);
			const startLocal = new Date(y, m - 1, d_part);
			d = d.filter((item: any) => item.created_at >= startLocal);
		}
		if (endDate) {
			const [y, m, d_part] = endDate.split('-').map(Number);
			const endLocal = new Date(y, m - 1, d_part);
			endLocal.setHours(23, 59, 59, 999);
			d = d.filter((item: any) => item.created_at <= endLocal);
		}
		return d;
	});

	let activityStats = $derived.by(() => {
		const stats = {
			ihana: { label: 'Ihana', count: 0, icon: '❤️' },
			calvin_day: { label: 'Calvin Day', count: 0, icon: '✨' },
			exercise: { label: 'Exercise', count: 0, icon: '🏃' },
			call_family: { label: 'Family Calls', count: 0, icon: '📞' },
			cry: { label: 'Cry', count: 0, icon: '😢' },
			loving: { label: 'Loving', count: 0, icon: '💌' },
			friends: { label: 'Friends', count: 0, icon: '👥' },
			sickness: { label: 'Sick Days', count: 0, icon: '🤒' },
			work: { label: 'Work', count: 0, icon: '💼' },
			study: { label: 'Study', count: 0, icon: '📚' },
			culture: { label: 'Culture', count: 0, icon: '🎭' },
			art: { label: 'Art', count: 0, icon: '🎨' },
			music: { label: 'Music', count: 0, icon: '🎵' },
			leisure: { label: 'Leisure', count: 0, icon: '🎮' }
		};

		for (const d of filteredData) {
			if (d.exercise_type && d.exercise_type.trim()) stats.exercise.count++;
			if (d.ihana === true) stats.ihana.count++;
			if (d.calvin_day === true) stats.calvin_day.count++;
			if (d.sickness === true) stats.sickness.count++;
			if (d.work_type && d.work_type.trim()) stats.work.count++;
			if (d.study_type && d.study_type.trim()) stats.study.count++;
			if (d.culture_type && d.culture_type.trim()) stats.culture.count++;
			if (d.art_type && d.art_type.trim()) stats.art.count++;
			if (d.music_type && d.music_type.trim()) stats.music.count++;
			if (d.leisure_type && d.leisure_type.trim()) stats.leisure.count++;
			if (d.call_family === true) stats.call_family.count++;
			if (d.cry === true) stats.cry.count++;
			if (d.loving === true) stats.loving.count++;
			if (d.friends === true) stats.friends.count++;
		}

		return stats;
	});

	// Groups: one ring per activity type that has count > 0
	let iconGroups = $derived.by(() => {
		const groups: { key: string; emoji: string; count: number }[] = [];
		for (const [key, stat] of Object.entries(activityStats)) {
			if (stat.count > 0) {
				groups.push({ key, emoji: stat.icon, count: stat.count });
			}
		}
		return groups;
	});

	onMount(() => {
		supabase.auth.getSession().then(({ data: { session: s } }) => {
			session = s;
			if (s) fetchData();
		});

		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_event, _session) => {
			session = _session;
			if (_session) fetchData();
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

	async function fetchData() {
		const { data: d, error } = await supabase
			.from('dailyTracking')
			.select(
				'created_at, mood, exercise_type, ihana, calvin_day, sickness, work_type, study_type, culture_type, art_type, music_type, leisure_type, call_family, cry, loving, friends'
			)
			.order('created_at', { ascending: true });

		if (!error && d) {
			rawData = d;
		} else if (error) {
			console.error('Error fetching data:', error);
		}
	}

	// Latest entry by date (most recent) for mood-based model
	let latestMood = $derived.by(() => {
		if (!parsedData.length) return null;
		const latest = parsedData[parsedData.length - 1];
		return latest.mood != null ? Number(latest.mood) : null;
	});
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
						{iconGroups}
						latestMood={latestMood}
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
