<script lang="ts">
	import { base } from '$app/paths';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import type { Session } from '@supabase/supabase-js';
	import { Canvas } from '@threlte/core';
	import ExperimentalScene from '$lib/components/ExperimentalScene.svelte';

	const backgroundImageUrl = `${base || ''}/rfuMwcFyzT8AwB18yvQA1_ZSXIOYYD.png`;

	let session = $state<Session | null>(null);
	let rawData = $state<any[]>([]);
	let eventsCurrentMonthOnly = $state(false);
	let containerRef: HTMLDivElement | undefined = $state();
	let canvasReady = $state(false);

	// Simulation Controls State
	let showControls = $state(false);
	let maxSpeed = $state(0.2);
	let separationFactor = $state(0.2);
	let alignFactor = $state(0.05);
	let cohesionFactor = $state(0.05);
	let boundsSize = $state(40);

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

	// Same activity stats as main page (events section)
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

		let dataToCount = filteredData;
		if (eventsCurrentMonthOnly) {
			const now = new Date();
			const currentMonth = now.getMonth();
			const currentYear = now.getFullYear();
			dataToCount = filteredData.filter((d: any) => {
				const date = d.created_at;
				return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
			});
		}

		for (const d of dataToCount) {
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

	// Flat list: for each stat, add `count` entries of { emoji, key } (no labels). Fallback demo icons if no data.
	const demoIcons = [
		{ emoji: '❤️', key: 'demo' },
		{ emoji: '✨', key: 'demo' },
		{ emoji: '👥', key: 'demo' },
		{ emoji: '🎨', key: 'demo' },
		{ emoji: '📚', key: 'demo' }
	];
	let floatingIcons = $derived.by(() => {
		const fromStats = Object.entries(activityStats).flatMap(([key, stat]) =>
			Array.from({ length: stat.count }, () => ({ emoji: stat.icon, key }))
		);
		return fromStats.length > 0 ? fromStats : demoIcons;
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

		// Defer Canvas mount until container has size to avoid WebGL "destination rect smaller than viewport" warning
		const checkSize = () => {
			if (containerRef && containerRef.clientWidth > 0 && containerRef.clientHeight > 0) {
				canvasReady = true;
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
				'created_at, exercise_type, ihana, calvin_day, sickness, work_type, study_type, culture_type, art_type, music_type, leisure_type, call_family, cry, loving, friends'
			)
			.order('created_at', { ascending: true });

		if (!error && d) {
			rawData = d;
		} else if (error) {
			console.error('Error fetching data:', error);
		}
	}
</script>

<svelte:head>
	<title>Experimental | CG Tracker 2026</title>
</svelte:head>

{#if session}
	<div class="experimental-container" bind:this={containerRef}>
		{#if canvasReady}
			<Canvas>
				<ExperimentalScene
					{floatingIcons}
					{backgroundImageUrl}
					{maxSpeed}
					{separationFactor}
					{alignFactor}
					{cohesionFactor}
					{boundsSize}
				/>
			</Canvas>
		{/if}
		<!-- Simulation Controls Toggle -->
		<div class="absolute right-4 bottom-4 z-10 flex flex-col items-end gap-2">
			<button
				onclick={() => (showControls = !showControls)}
				class="rounded-full bg-zinc-800/80 px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-sm transition-colors hover:bg-zinc-700"
			>
				{showControls ? 'Hide Controls' : 'Show Controls'}
			</button>

			{#if showControls}
				<div
					class="flex w-64 flex-col gap-4 rounded-lg bg-zinc-900/90 p-4 text-xs backdrop-blur-md"
				>
					<div class="flex flex-col gap-1">
						<label for="speed" class="flex justify-between text-zinc-400">
							<span>Max Speed</span>
							<span>{maxSpeed.toFixed(2)}</span>
						</label>
						<input
							type="range"
							id="speed"
							min="0.01"
							max="1.0"
							step="0.01"
							bind:value={maxSpeed}
							class="accent-indigo-500"
						/>
					</div>

					<div class="flex flex-col gap-1">
						<label for="separation" class="flex justify-between text-zinc-400">
							<span>Separation</span>
							<span>{separationFactor.toFixed(2)}</span>
						</label>
						<input
							type="range"
							id="separation"
							min="0"
							max="1.0"
							step="0.01"
							bind:value={separationFactor}
							class="accent-indigo-500"
						/>
					</div>

					<div class="flex flex-col gap-1">
						<label for="alignment" class="flex justify-between text-zinc-400">
							<span>Alignment</span>
							<span>{alignFactor.toFixed(2)}</span>
						</label>
						<input
							type="range"
							id="alignment"
							min="0"
							max="0.2"
							step="0.001"
							bind:value={alignFactor}
							class="accent-indigo-500"
						/>
					</div>

					<div class="flex flex-col gap-1">
						<label for="cohesion" class="flex justify-between text-zinc-400">
							<span>Cohesion</span>
							<span>{cohesionFactor.toFixed(2)}</span>
						</label>
						<input
							type="range"
							id="cohesion"
							min="0"
							max="0.2"
							step="0.001"
							bind:value={cohesionFactor}
							class="accent-indigo-500"
						/>
					</div>

					<div class="flex flex-col gap-1">
						<label for="bounds" class="flex justify-between text-zinc-400">
							<span>Bounds Size</span>
							<span>{boundsSize}</span>
						</label>
						<input
							type="range"
							id="bounds"
							min="10"
							max="100"
							step="1"
							bind:value={boundsSize}
							class="accent-indigo-500"
						/>
					</div>
				</div>
			{/if}
		</div>

		<!-- Optional: toggle same as main page -->
		<div class="absolute bottom-4 left-4 z-10">
			<button
				onclick={() => (eventsCurrentMonthOnly = !eventsCurrentMonthOnly)}
				class="rounded-full bg-zinc-800/80 px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-sm transition-colors hover:bg-zinc-700 {eventsCurrentMonthOnly
					? 'bg-indigo-500/30 text-indigo-300'
					: ''}"
			>
				{eventsCurrentMonthOnly ? 'This Month' : 'All Time'}
			</button>
		</div>
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

	/* Ensure Threlte canvas wrapper and canvas fill the container so WebGL viewport matches */
	:global(.experimental-container > div:first-child),
	:global(.experimental-container > div:first-child canvas) {
		width: 100%;
		height: 100%;
	}
</style>
