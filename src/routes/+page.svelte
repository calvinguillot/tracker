<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { base } from '$app/paths';
	import { onMount } from 'svelte';
	import type { Session } from '@supabase/supabase-js';
	import { Loader, ArrowUp, ArrowDown, CheckSquare, Palette, SquareCheckBig } from 'lucide-svelte';
	import { LayerCake, Svg, Html } from 'layercake';
	import { scaleTime } from 'd3-scale';
	import { timeFormat } from 'd3-time-format';

	import Line from '$lib/components/chart/Line.svelte';
	import AxisX from '$lib/components/chart/AxisX.svelte';
	import AxisY from '$lib/components/chart/AxisY.svelte';
	import SharedTooltip from '$lib/components/chart/SharedTooltip.svelte';
	import { showAlert, alertState } from '$lib/alertStore.svelte';
	import { settings } from '$lib/settingsStore.svelte';
	import { dataStore } from '$lib/dataStore.svelte';
	import { Capacitor } from '@capacitor/core';

	// Types for today's deadlines
	type TodayTask = {
		id: number;
		title: string;
		status: string;
		type: string | null;
		color: string | null;
		deadline_at: string;
	};

	type TodayArtCall = {
		id: number;
		name: string;
		location: string;
		type: number | null;
		funds: number | null;
		deadline: string;
		applied: boolean;
	};

	type DeadlineItem = { kind: 'task'; data: TodayTask } | { kind: 'artcall'; data: TodayArtCall };

	let { data } = $props();
	let session = $state<Session | null>(null);
	// let isLoading = $state(true); // Removed
	// let isStatsLoading = $state(false); // Removed

	let rawData = $derived(dataStore.dailyTracking);

	let appliedArtCallsCount = $derived(dataStore.artCalls.filter((a) => a.applied).length);
	let completedProjectsCount = $derived(dataStore.projects.filter((p) => p.status === 3).length);
	let completedTasksCount = $derived(dataStore.tasks.filter((t) => t.status === 'done').length);

	// Today's deadlines
	let todayTasks = $derived.by(() => {
		const today = new Date();
		const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
		const start = todayStr + 'T00:00:00';
		const end = todayStr + 'T23:59:59';

		return dataStore.tasks
			.filter((t) => {
				if (t.status === 'done') return false;
				if (!t.deadline_at) return false;
				return t.deadline_at >= start && t.deadline_at <= end;
			})
			.sort((a, b) => a.deadline_at.localeCompare(b.deadline_at));
	});

	let todayArtCalls = $derived.by(() => {
		const today = new Date();
		const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
		const start = todayStr + 'T00:00:00';
		const end = todayStr + 'T23:59:59';

		return dataStore.artCalls
			.filter((a) => {
				if (a.applied) return false;
				if (!a.deadline) return false;
				return a.deadline >= start && a.deadline <= end;
			})
			.sort((a, b) => a.deadline.localeCompare(b.deadline));
	});

	// Combined and sorted deadlines for today
	let todayDeadlines = $derived.by(() => {
		const items: DeadlineItem[] = [
			...todayTasks.map((t) => ({ kind: 'task' as const, data: t })),
			...todayArtCalls.map((a) => ({ kind: 'artcall' as const, data: a }))
		];
		// Tasks are already sorted, but mixing them might require re-sort if we care about time within day (if any)
		// For now, task/artcall order is fine.
		return items;
	});

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

	// Calculate Y Domain: min 0, at least 0–10 range, scale up for weight etc.
	const Y_DOMAIN_MIN = 0;
	const Y_DOMAIN_MAX_AT_LEAST = 10;

	let yDomain = $derived.by(() => {
		const activeKeys = (Object.keys(activeMetrics) as MetricKey[]).filter(
			(k) => activeMetrics[k].active
		);
		if (activeKeys.length === 0) return [Y_DOMAIN_MIN, Y_DOMAIN_MAX_AT_LEAST];

		let max = 0;
		for (const d of filteredData) {
			for (const key of activeKeys) {
				const val = d[key];
				if (typeof val === 'number' && val > max) {
					max = val;
				}
			}
		}
		const upper = Math.max(Y_DOMAIN_MAX_AT_LEAST, max * 1.1);
		return [Y_DOMAIN_MIN, upper];
	});

	// Formatting - using numeric format for better readability
	const formatTime = timeFormat('%m/%d');

	// Events toggle: all time vs current month
	let eventsCurrentMonthOnly = $state(true);

	// Metrics dropdown state
	let metricsDropdownOpen = $state(false);
	let activeMetricsCount = $derived(
		(Object.values(activeMetrics) as { active: boolean }[]).filter((m) => m.active).length
	);

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
		});

		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_event, _session) => {
			session = _session;
		});

		return () => subscription.unsubscribe();
	});

	function toggleMetric(key: string) {
		const k = key as MetricKey;
		activeMetrics[k].active = !activeMetrics[k].active;
	}

	// Helper functions for deadline cards
	function getStatusColor(status: string | null) {
		switch (status) {
			case 'todo':
				return { bg: 'bg-zinc-500/10', text: 'text-zinc-400' };
			case 'in_progress':
				return { bg: 'bg-indigo-500/10', text: 'text-indigo-400' };
			case 'done':
				return { bg: 'bg-emerald-500/10', text: 'text-emerald-400' };
			default:
				return { bg: 'bg-zinc-500/10', text: 'text-zinc-400' };
		}
	}

	function getStatusLabel(status: string | null) {
		if (!status) return 'Unknown';
		return status
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
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
	{#if session}
		<div class="space-y-4">
			<!-- Main Content: Chart + Events + Today's Tasks side by side on desktop -->
			<!-- Desktop: 1/2 Chart, 1/4 Events, 1/4 Today's Tasks + Done -->
			<!-- Mobile: Chart first, then Today's Tasks, then Events -->
			<div class="grid gap-4 lg:grid-cols-4">
				<!-- Timeline (Chart) - 1/2 width on desktop, first on mobile -->
				<div class="order-1 space-y-3 lg:order-1 lg:col-span-2">
					<h2 class="hidden text-lg font-bold text-zinc-100 md:block">Dashboard</h2>

					<!-- Controls toolbar (no card background, above chart) -->
					<div class="flex flex-wrap items-center justify-between gap-4 text-sm">
						<!-- Metrics Multi-Select Dropdown -->
						<div class="flex flex-wrap items-center gap-2">
							<span class="text-zinc-500">Metrics:</span>
							<div class="relative">
								<button
									onclick={() => (metricsDropdownOpen = !metricsDropdownOpen)}
									class="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 shadow-sm transition-colors hover:bg-zinc-700"
								>
									<!-- Color chips for active metrics -->
									<div class="flex items-center gap-1">
										{#each Object.entries(activeMetrics) as [key, config]}
											{#if config.active}
												<span
													class="h-2.5 w-2.5 rounded-full"
													style:background-color={config.color}
													title={config.label}
												></span>
											{/if}
										{/each}
									</div>
									<span class="text-zinc-400">{activeMetricsCount} selected</span>
									<ArrowDown class="h-3.5 w-3.5 text-zinc-400" />
								</button>

								{#if metricsDropdownOpen}
									<!-- Backdrop to close dropdown -->
									<button
										class="fixed inset-0 z-10"
										onclick={() => (metricsDropdownOpen = false)}
										aria-label="Close dropdown"
									></button>
									<!-- Dropdown panel -->
									<div
										class="absolute left-0 z-20 mt-1 w-48 rounded-md border border-zinc-700 bg-zinc-800 py-1 shadow-lg"
									>
										{#each Object.entries(activeMetrics) as [key, config]}
											<button
												class="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors hover:bg-zinc-700"
												onclick={() => toggleMetric(key)}
											>
												<span class="h-3 w-3 rounded-full" style:background-color={config.color}
												></span>
												<span class={config.active ? 'text-zinc-100' : 'text-zinc-400'}>
													{config.label}
												</span>
												{#if config.active}
													<svg
														class="ml-auto h-4 w-4 text-indigo-400"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M5 13l4 4L19 7"
														/>
													</svg>
												{/if}
											</button>
										{/each}
									</div>
								{/if}
							</div>
						</div>

						<!-- Date Range -->
						<!-- <div class="flex flex-wrap items-center gap-2">
							<span class="text-zinc-500">Range:</span>
							<input
								type="date"
								bind:value={startDate}
								class="cursor-pointer rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 shadow-sm outline-none focus:border-indigo-500 focus:ring-indigo-500"
							/>
							<span class="text-zinc-500">to</span>
							<input
								type="date"
								bind:value={endDate}
								class="cursor-pointer rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 shadow-sm outline-none focus:border-indigo-500 focus:ring-indigo-500"
							/>
							{#if startDate || endDate}
								<button
									onclick={() => {
										startDate = '';
										endDate = '';
									}}
									class="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-400 shadow-sm transition-colors hover:bg-zinc-700 hover:text-zinc-100"
								>
									Reset
								</button>
							{/if}
						</div> -->
					</div>

					{#if filteredData.length > 1}
						<div class="relative h-[400px] w-full rounded-lg bg-zinc-900 p-4 shadow-lg">
							<div
								class="absolute top-4 left-1/2 z-10 -translate-x-1/2 text-sm font-semibold text-zinc-300"
							>
								{filteredData.length} Entries
							</div>
							<LayerCake
								padding={{ top: 20, right: 10, bottom: 20, left: 25 }}
								x="created_at"
								y="value"
								{yDomain}
								xScale={scaleTime()}
								data={filteredData}
							>
								<Html>
									<AxisX
										gridlines={false}
										ticks={filteredData.length > 10 ? 5 : filteredData.length}
										formatTick={formatTime}
										tickMarks={true}
									/>
									<AxisY gridlines={true} ticks={5} tickMarks={true} />
								</Html>
								<Svg>
									{#each Object.entries(activeMetrics) as [key, config]}
										{#if config.active}
											<Line
												stroke={config.color}
												y={(d: any) => d[key] ?? 0}
												width={2}
												curve={false}
											/>
										{/if}
									{/each}
								</Svg>
								<Html>
									<SharedTooltip dataset={filteredData} formatTitle={formatTime} {activeMetrics} />
								</Html>
							</LayerCake>
						</div>
					{:else}
						<div
							class="flex h-[400px] w-full items-center justify-center rounded-lg bg-zinc-900 shadow-lg"
						>
							<span class="text-zinc-500">Not enough data to display chart</span>
						</div>
					{/if}
				</div>

				<!-- Events Column - 1/4 width on desktop, third on mobile -->
				{#if filteredData.length > 0}
					<div class="order-3 space-y-3 lg:order-2 lg:col-span-1">
						<div class="flex items-center justify-between">
							<h2 class="text-lg font-semibold text-zinc-100">Events</h2>
							<button
								onclick={() => (eventsCurrentMonthOnly = !eventsCurrentMonthOnly)}
								class="text-xs font-medium text-indigo-400 hover:text-indigo-300"
								title={eventsCurrentMonthOnly ? 'Show all time' : 'Show current month'}
								style={!eventsCurrentMonthOnly ? `color: ${settings.getAccentLightHex()}` : ''}
							>
								{eventsCurrentMonthOnly ? 'This Month' : 'All Time'}
							</button>
						</div>
						<div class="grid grid-cols-2 gap-2">
							{#each Object.entries(activityStats) as [key, stat]}
								<div
									class="rounded-lg bg-zinc-900 px-2 py-2 shadow-lg transition-all hover:bg-zinc-800"
								>
									<div class="flex items-center gap-1.5">
										<span class="text-lg">{stat.icon}</span>
										<div class="min-w-0 flex-1">
											<div class="truncate text-xs font-medium text-zinc-300">
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
					</div>
				{/if}

				<!-- Today's Tasks + Done - 1/4 width on desktop, second on mobile -->
				{#if filteredData.length > 0}
					<div class="order-2 space-y-3 lg:order-3 lg:col-span-1">
						<!-- Today's Tasks Section -->
						<h2 class="text-lg font-semibold text-zinc-100">Today's Tasks</h2>
						{#if todayDeadlines.length === 0}
							<div class="rounded-lg bg-zinc-900/60 px-3 py-4 text-center text-sm text-zinc-500">
								No deadlines for today
							</div>
						{:else}
							<div class="grid grid-cols-1 gap-2">
								{#each todayDeadlines as item}
									{#if item.kind === 'task'}
										{@const task = item.data}
										{@const statusStyle = getStatusColor(task.status)}
										<div
											class="rounded-lg bg-zinc-900 px-3 py-2.5 shadow-lg transition-all hover:bg-zinc-800"
										>
											<div class="flex items-center gap-2.5">
												<SquareCheckBig class="h-4 w-4 text-indigo-400" />
												<div class="min-w-0 flex-1">
													<div
														class="truncate text-sm font-medium text-zinc-100"
														title={task.title}
													>
														{task.title}
													</div>
													<div class="flex items-center gap-2 text-xs">
														<span
															class={`rounded-full px-1.5 py-0.5 ${statusStyle.bg} ${statusStyle.text}`}
														>
															{getStatusLabel(task.status)}
														</span>
														{#if task.type}
															<span class="text-zinc-500"
																>{settings.getTaskType(task.type)?.label ?? task.type}</span
															>
														{/if}
													</div>
												</div>
											</div>
										</div>
									{:else}
										{@const artCall = item.data}
										<div
											class="rounded-lg bg-zinc-900 px-3 py-2.5 shadow-lg transition-all hover:bg-zinc-800"
										>
											<div class="flex items-center gap-2.5">
												<Palette class="h-4 w-4 text-emerald-400" />
												<div class="min-w-0 flex-1">
													<div
														class="truncate text-sm font-medium text-zinc-100"
														title={artCall.name}
													>
														{artCall.name}
													</div>
													<div class="flex items-center gap-2 text-xs text-zinc-400">
														<span class="truncate">{artCall.location}</span>
														{#if artCall.funds}
															<span class="text-zinc-500">•</span>
															<span class="text-emerald-400">€{artCall.funds}</span>
														{/if}
													</div>
												</div>
											</div>
										</div>
									{/if}
								{/each}
							</div>
						{/if}

						<!-- Done Section -->
						<div class="pt-2">
							<h2 class="text-lg font-semibold text-zinc-100">Done</h2>
						</div>
						<div class="grid grid-cols-2 gap-2 lg:grid-cols-1">
							<div
								class="rounded-lg bg-zinc-900 px-3 py-2.5 shadow-lg transition-all hover:bg-zinc-800"
							>
								<div class="flex items-center gap-2.5">
									<span class="text-lg">📝</span>
									<div class="flex-1">
										<div class="text-xs font-medium text-zinc-300">Applied Art Calls</div>
									</div>
									<div class="text-xl font-bold text-white">
										{appliedArtCallsCount}
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
										{completedProjectsCount}
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
										{completedTasksCount}
									</div>
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<div class="flex flex-1 flex-col items-center justify-center text-center">
			<div class="mb-8">
				<div
					class="jiggle-link group flex text-4xl font-bold tracking-tight text-zinc-100 transition-colors"
					style="--accent-color: {settings.getAccentLightHex()}"
				>
					{#each 'CG Tracker'.split('') as char, i}
						<span
							class="jiggle-char group-hover:text-(--accent-color)"
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
