<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { base } from '$app/paths';
	import { onMount } from 'svelte';
	import type { Session } from '@supabase/supabase-js';
	import { Loader } from 'lucide-svelte';
	import { LayerCake, Svg, Html } from 'layercake';
	import { scaleTime } from 'd3-scale';
	import { timeFormat } from 'd3-time-format';

	import Line from '$lib/components/chart/Line.svelte';
	import AxisX from '$lib/components/chart/AxisX.svelte';
	import AxisY from '$lib/components/chart/AxisY.svelte';
	import SharedTooltip from '$lib/components/chart/SharedTooltip.svelte';
	import { showAlert, alertState } from '$lib/alertStore.svelte';
	import { settings } from '$lib/settingsStore.svelte';
	import { Capacitor } from '@capacitor/core';

	let { data } = $props();
	let session = $state<Session | null>(null);
	let isLoading = $state(true);
	let isStatsLoading = $state(false);

	let rawData = $state<any[]>([]);
	let appliedArtCallsCount = $state(0);
	let completedProjectsCount = $state(0);
	let completedTasksCount = $state(0);

	let parsedData = $derived(
		rawData
			.map((d: any) => ({
				...d,
				created_at: new Date(d.created_at)
			}))
			.sort((a: any, b: any) => a.created_at.getTime() - b.created_at.getTime())
	);

	// Metrics configuration
	const initialMetrics = {
		mood: { label: 'Mood', color: '#8b5cf6', active: true }, // violet-500
		energy: { label: 'Energy', color: '#f97316', active: true }, // orange-500
		physical: { label: 'Physical', color: '#ef4444', active: true }, // red-500
		sleep: { label: 'Sleep', color: '#3b82f6', active: true }, // blue-500
		meals: { label: 'Meals', color: '#22c55e', active: true }, // green-500
		weight: { label: 'Weight', color: '#71717a', active: false } // zinc-500
	};

	type MetricKey = keyof typeof initialMetrics;

	let activeMetrics = $state(initialMetrics);

	// Date Range Filter
	let startDate = $state('');
	let endDate = $state('');

	// Effect to set default range
	$effect(() => {
		if (parsedData.length > 0 && !startDate && !endDate) {
			const start = parsedData[0].created_at;
			const end = new Date();

			const formatDate = (date: Date) => {
				const year = date.getFullYear();
				const month = String(date.getMonth() + 1).padStart(2, '0');
				const day = String(date.getDate()).padStart(2, '0');
				return `${year}-${month}-${day}`;
			};

			startDate = formatDate(start);
			endDate = formatDate(end);
		}
	});

	let filteredData = $derived.by(() => {
		let d = parsedData;
		if (startDate) {
			// Create date at midnight local time to compare
			// Input type="date" returns YYYY-MM-DD
			// new Date(startDate) creates a date at 00:00:00 UTC usually if simple string, or local.
			// Let's force it to be start of day in local time or consistent with how created_at is parsed.
			// parsedData uses new Date(timestamp string).

			// To ensure inclusive start date, we want entries where created_at >= start of that day.
			const [y, m, d_part] = startDate.split('-').map(Number);
			const startLocal = new Date(y, m - 1, d_part);

			d = d.filter((item: any) => item.created_at >= startLocal);
		}
		if (endDate) {
			const [y, m, d_part] = endDate.split('-').map(Number);
			const endLocal = new Date(y, m - 1, d_part);
			// Set end date to end of day to include the selected date
			endLocal.setHours(23, 59, 59, 999);
			d = d.filter((item: any) => item.created_at <= endLocal);
		}
		return d;
	});

	// Calculate Y Domain dynamically based on active metrics
	let yDomain = $derived.by(() => {
		const activeKeys = (Object.keys(activeMetrics) as MetricKey[]).filter(
			(k) => activeMetrics[k].active
		);
		if (activeKeys.length === 0) return [0, 10]; // Default range

		let max = 0;
		for (const d of filteredData) {
			for (const key of activeKeys) {
				const val = d[key];
				if (typeof val === 'number' && val > max) {
					max = val;
				}
			}
		}
		// Add some padding to top
		return [0, max * 1.1];
	});

	// Formatting - using numeric format for better readability
	const formatTime = timeFormat('%m/%d');

	// Events toggle: all time vs current month
	let eventsCurrentMonthOnly = $state(false);

	// Activity Statistics
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

		// Filter data based on toggle
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

	onMount(() => {
		supabase.auth.getSession().then(({ data: { session: s } }) => {
			session = s;
			if (s) {
				fetchData();
				fetchProjectStats();
			} else isLoading = false;
		});

		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_event, _session) => {
			session = _session;
			if (_session) {
				fetchData();
				fetchProjectStats();
			} else isLoading = false;
		});

		return () => subscription.unsubscribe();
	});

	async function fetchData() {
		isLoading = true;
		const { data: d, error } = await supabase
			.from('dailyTracking')
			.select(
				'created_at, mood, energy, physical, sleep, meals, weight, exercise_type, ihana, calvin_day, sickness, work_type, study_type, culture_type, art_type, music_type, leisure_type, call_family, cry, loving, friends'
			)
			.order('created_at', { ascending: true });

		if (!error && d) {
			rawData = d;
		} else if (error) {
			console.error('Error fetching data:', error);
		}
		isLoading = false;
	}

	async function fetchProjectStats() {
		isStatsLoading = true;

		const [
			{ count: appliedCount, error: appliedError },
			{ count: completedCount, error: completedError },
			{ count: completedTasksCountRes, error: completedTasksError }
		] = await Promise.all([
			supabase.from('artCalls').select('id', { count: 'exact', head: true }).eq('applied', true),
			supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 3),
			supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'done')
		]);

		if (appliedError) {
			console.error('Error fetching applied art calls count:', appliedError);
		} else {
			appliedArtCallsCount = appliedCount ?? 0;
		}

		if (completedError) {
			console.error('Error fetching completed projects count:', completedError);
		} else {
			completedProjectsCount = completedCount ?? 0;
		}

		if (completedTasksError) {
			console.error('Error fetching completed tasks count:', completedTasksError);
		} else {
			completedTasksCount = completedTasksCountRes ?? 0;
		}

		isStatsLoading = false;
	}

	function toggleMetric(key: string) {
		const k = key as MetricKey;
		activeMetrics[k].active = !activeMetrics[k].active;
	}

	function convertToCSV(objArray: any[]) {
		if (!objArray || objArray.length === 0) return '';
		const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;

		// Collect all unique headers from all objects to handle varying schemas if any
		const headers = Object.keys(array[0]);
		let str = headers.join(',') + '\r\n';

		for (let i = 0; i < array.length; i++) {
			let line = '';
			for (const header of headers) {
				if (line !== '') line += ',';

				let item = array[i][header];

				if (item === null || item === undefined) {
					item = '';
				} else if (typeof item === 'object') {
					// JSON objects like checklist or arrays
					item = JSON.stringify(item).replace(/"/g, '""');
					item = `"${item}"`;
				} else {
					item = String(item).replace(/"/g, '""');
					if (item.search(/("|,|\n)/g) >= 0) {
						item = `"${item}"`;
					}
				}
				line += item;
			}
			str += line + '\r\n';
		}
		return str;
	}

	async function signInWithGithub() {
		const redirectTo = Capacitor.isNativePlatform()
			? 'com.cgtracker.app://auth/callback'
			: `${window.location.origin}${base}/auth/callback`;
		const { error } = await supabase.auth.signInWithOAuth({
			provider: 'github',
			options: { redirectTo }
		});
		if (error) console.error('Error signing in:', error);
	}

	async function backupDatabase() {
		const tables = ['dailyTracking', 'projects', 'artCalls', 'notes', 'tasks'];

		for (const table of tables) {
			const { data, error } = await supabase.from(table).select('*');

			if (error) {
				console.error(`Error fetching ${table}:`, error);
				showAlert(`Error backing up ${table}: ${error.message}`, 'Error');
				continue;
			}

			if (!data || data.length === 0) continue;

			const csv = convertToCSV(data);
			const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
			const link = document.createElement('a');
			const url = URL.createObjectURL(blob);

			link.setAttribute('href', url);
			link.setAttribute(
				'download',
				`${table}_backup_${new Date().toISOString().split('T')[0]}.csv`
			);
			link.style.visibility = 'hidden';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			// Small delay to prevent browser blocking multiple downloads
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
	}
</script>

<div class="flex flex-1 flex-col">
	{#if isLoading && session !== null}
		<div class="flex h-64 items-center justify-center">
			<Loader class="h-8 w-8 animate-spin text-indigo-500" />
		</div>
	{:else if session}
		<div class="space-y-4">
			<!-- Main Content: Chart + Events side by side on desktop -->
			<div class="grid gap-4 lg:grid-cols-3">
				<!-- Timeline (Chart) - 2/3 width on desktop -->
				<div class="space-y-3 lg:col-span-2">
					<h2 class="text-lg font-bold text-zinc-100">Dashboard</h2>

					<!-- Controls -->
					<div class="space-y-3 rounded-lg bg-zinc-900 p-4 shadow-lg">
						<div class="flex flex-wrap items-center gap-4">
							<span class="text-sm font-medium text-zinc-300">Metrics:</span>
							<div class="flex flex-wrap gap-2">
								{#each Object.entries(activeMetrics) as [key, config]}
									<button
										class="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
										style:background-color={config.active ? config.color + '20' : 'transparent'}
										style:border-color={config.active ? config.color : '#3f3f46'}
										style:color={config.active ? config.color : '#a1a1aa'}
										onclick={() => toggleMetric(key)}
									>
										{config.label}
									</button>
								{/each}
							</div>
						</div>

						<div class="flex flex-wrap items-center gap-4">
							<span class="text-sm font-medium text-zinc-300">Date Range:</span>
							<input
								type="date"
								bind:value={startDate}
								class="rounded border-zinc-600 bg-zinc-700 px-2 py-1 text-sm text-white focus:border-indigo-500 focus:ring-indigo-500"
							/>
							<span class="text-zinc-500">to</span>
							<input
								type="date"
								bind:value={endDate}
								class="rounded border-zinc-600 bg-zinc-700 px-2 py-1 text-sm text-white focus:border-indigo-500 focus:ring-indigo-500"
							/>
							{#if startDate || endDate}
								<button
									onclick={() => {
										startDate = '';
										endDate = '';
									}}
									class="text-xs text-indigo-400 underline hover:text-indigo-300"
								>
									Reset
								</button>
							{/if}
						</div>
					</div>

					{#if filteredData.length > 1}
						<div class="relative h-[400px] w-full rounded-lg bg-zinc-900 p-4 shadow-lg">
							<LayerCake
								padding={{ top: 20, right: 15, bottom: 32, left: 30 }}
								x={(d: any) => d.created_at}
								{yDomain}
								data={filteredData}
								xScale={scaleTime()}
							>
								<Svg>
									<AxisX gridlines={false} ticks={5} format={formatTime} dy={12} />
									<AxisY ticks={4} gridlines={true} />
									{#each Object.entries(activeMetrics) as [key, config]}
										{#if config.active}
											<Line stroke={config.color} yAccessorKey={key} />
										{/if}
									{/each}
								</Svg>
								<Html>
									<SharedTooltip
										labels={Object.fromEntries(
											Object.entries(activeMetrics)
												.filter(([k, v]) => v.active)
												.map(([k, v]) => [k, { text: v.label, color: v.color }])
										)}
										formatTitle={formatTime}
									/>
								</Html>
							</LayerCake>
						</div>
					{:else}
						<div class="rounded-lg bg-zinc-900 p-8 text-center text-zinc-400 shadow-lg">
							Not enough data to display chart. Add more entries!
						</div>
					{/if}
				</div>

				<!-- Events - 1/3 width on desktop -->
				{#if filteredData.length > 0}
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<h2 class="text-lg font-semibold text-zinc-100">Events</h2>
							<button
								onclick={() => (eventsCurrentMonthOnly = !eventsCurrentMonthOnly)}
								class="flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-colors {eventsCurrentMonthOnly
									? 'bg-indigo-500/20 text-indigo-400'
									: 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'}"
							>
								{eventsCurrentMonthOnly ? 'This Month' : 'All Time'}
							</button>
						</div>
						<div class="grid grid-cols-2 gap-2">
							{#each Object.entries(activityStats) as [key, stat]}
								<div
									class="rounded-lg bg-zinc-900 px-3 py-2.5 shadow-lg transition-all hover:bg-zinc-800"
								>
									<div class="flex items-center gap-2.5">
										<span class="text-lg">{stat.icon}</span>
										<div class="flex-1">
											<div class="text-xs font-medium text-zinc-300">
												{stat.label}
											</div>
										</div>
										<div class="text-xl font-bold text-white">
											{stat.count}
										</div>
									</div>
								</div>
							{/each}
						</div>
						<div class="pt-2">
							<h2 class="text-lg font-semibold text-zinc-100">Projects</h2>
						</div>
						<div class="grid grid-cols-2 gap-2">
							<div
								class="rounded-lg bg-zinc-900 px-3 py-2.5 shadow-lg transition-all hover:bg-zinc-800"
							>
								<div class="flex items-center gap-2.5">
									<span class="text-lg">📝</span>
									<div class="flex-1">
										<div class="text-xs font-medium text-zinc-300">Applied Art Calls</div>
									</div>
									<div class="text-xl font-bold text-white">
										{isStatsLoading ? '—' : appliedArtCallsCount}
									</div>
								</div>
							</div>
							<div
								class="rounded-lg bg-zinc-900 px-3 py-2.5 shadow-lg transition-all hover:bg-zinc-800"
							>
								<div class="flex items-center gap-2.5">
									<span class="text-lg">✅</span>
									<div class="flex-1">
										<div class="text-xs font-medium text-zinc-300">Completed Projects</div>
									</div>
									<div class="text-xl font-bold text-white">
										{isStatsLoading ? '—' : completedProjectsCount}
									</div>
								</div>
							</div>
							<div
								class="rounded-lg bg-zinc-900 px-3 py-2.5 shadow-lg transition-all hover:bg-zinc-800"
							>
								<div class="flex items-center gap-2.5">
									<span class="text-lg">☑️</span>
									<div class="flex-1">
										<div class="text-xs font-medium text-zinc-300">Completed Tasks</div>
									</div>
									<div class="text-xl font-bold text-white">
										{isStatsLoading ? '—' : completedTasksCount}
									</div>
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<div class="flex flex-[1] flex-col items-center justify-center text-center">
			<div class="mb-8">
				<div
					class="jiggle-link group flex text-4xl font-bold tracking-tight text-zinc-100 transition-colors"
					style="--accent-color: {settings.getAccentLightHex()}"
				>
					{#each 'CG Tracker 2026'.split('') as char, i}
						<span
							class="jiggle-char group-hover:text-[var(--accent-color)]"
							style="animation-delay: {i * 0.05}s"
						>
							{char}
						</span>
					{/each}
				</div>
			</div>

			<p class="mb-8 max-w-md text-lg text-zinc-400">
				Your personal dashboard for tracking daily activities, projects, and well-being.
			</p>

			<button
				onclick={signInWithGithub}
				class="flex items-center gap-3 rounded-full bg-zinc-100 px-8 py-4 text-base font-semibold text-zinc-900 transition-transform hover:scale-105 active:scale-95"
			>
				<svg class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
					<path
						d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
					/>
				</svg>
				Sign In with GitHub
			</button>
		</div>
	{/if}
</div>
