<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { base } from '$app/paths';
	import { onMount } from 'svelte';
	import type { Session } from '@supabase/supabase-js';
	import {
		ArrowDown,
		SquareCheckBig,
		Palette,
		Sun,
		Moon,
		CloudSun,
		CloudFog,
		CloudDrizzle,
		CloudRain,
		Snowflake,
		CloudLightning,
		Wind,
		Thermometer,
		Cloud
	} from 'lucide-svelte';
	import { LayerCake, Svg, Html } from 'layercake';
	import { scaleTime } from 'd3-scale';
	import { timeFormat } from 'd3-time-format';

	import Line from '$lib/components/chart/Line.svelte';
	import AxisX from '$lib/components/chart/AxisX.svelte';
	import AxisY from '$lib/components/chart/AxisY.svelte';
	import SharedTooltip from '$lib/components/chart/SharedTooltip.svelte';
	import EventsScatter from '$lib/components/chart/EventsScatter.svelte';
	import { settings } from '$lib/settingsStore.svelte';
	import { dataStore } from '$lib/dataStore.svelte';
	import { Capacitor } from '@capacitor/core';

	type TodayTask = {
		id: number;
		title: string;
		status: string;
		type: string | null;
		color: string | null;
		deadline_at: string;
		time_of_day: string | null;
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

	let rawData = $derived(dataStore.dailyTracking);

	// --- Weather ---
	let weatherData = $state<{
		temperature: number;
		weatherCode: number;
		windSpeed: number;
		isDay: boolean;
	} | null>(null);
	let weatherLoading = $state(false);
	let locationName = $state('');
	let locationCountry = $state('');

	function getWeatherIcon(code: number, isDay: boolean) {
		if (code === 0) return isDay ? Sun : Moon;
		if (code <= 3) return isDay ? CloudSun : Cloud;
		if (code <= 48) return CloudFog;
		if (code <= 57) return CloudDrizzle;
		if (code <= 67) return CloudRain;
		if (code <= 77) return Snowflake;
		if (code <= 82) return CloudRain;
		if (code <= 86) return Snowflake;
		return CloudLightning;
	}

	function getWeatherLabel(code: number): string {
		if (code === 0) return 'Clear Sky';
		if (code === 1) return 'Mostly Clear';
		if (code === 2) return 'Partly Cloudy';
		if (code === 3) return 'Overcast';
		if (code <= 48) return 'Foggy';
		if (code <= 55) return 'Drizzle';
		if (code <= 57) return 'Freezing Drizzle';
		if (code <= 65) return 'Rain';
		if (code <= 67) return 'Freezing Rain';
		if (code <= 75) return 'Snow';
		if (code === 77) return 'Snow Grains';
		if (code <= 82) return 'Showers';
		if (code <= 86) return 'Snow Showers';
		if (code === 95) return 'Thunderstorm';
		return 'Thunderstorm';
	}

	function getWeatherIconColor(code: number, isDay: boolean): string {
		if (code === 0) return isDay ? '#fbbf24' : '#818cf8';
		if (code <= 3) return '#94a3b8';
		if (code <= 48) return '#9ca3af';
		if (code <= 57) return '#60a5fa';
		if (code <= 67) return '#3b82f6';
		if (code <= 77) return '#e2e8f0';
		if (code <= 82) return '#3b82f6';
		if (code <= 86) return '#e2e8f0';
		return '#fbbf24';
	}

	function getBrowserLocation(): Promise<{ lat: number; lon: number } | null> {
		return new Promise((resolve) => {
			if (!navigator.geolocation) {
				resolve(null);
				return;
			}
			navigator.geolocation.getCurrentPosition(
				(pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
				() => resolve(null),
				{ timeout: 10000, maximumAge: 600000 }
			);
		});
	}

	async function loadWeather() {
		weatherLoading = true;
		try {
			const coords = await getBrowserLocation();
			if (!coords) return;

			const [weatherRes, reverseRes] = await Promise.all([
				fetch(
					`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code,wind_speed_10m,is_day`
				),
				fetch(
					`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lon}&zoom=10`,
					{ headers: { 'User-Agent': 'tracker-app' } }
				)
			]);

			const weatherJson = await weatherRes.json();
			if (weatherJson.current) {
				weatherData = {
					temperature: Math.round(weatherJson.current.temperature_2m),
					weatherCode: weatherJson.current.weather_code,
					windSpeed: Math.round(weatherJson.current.wind_speed_10m),
					isDay: weatherJson.current.is_day === 1
				};
			}

			const reverseJson = await reverseRes.json();
			const addr = reverseJson.address;
			locationName = addr?.city || addr?.town || addr?.village || addr?.municipality || '';
			locationCountry = addr?.country || '';
		} catch (e) {
			console.error('Weather fetch error:', e);
		} finally {
			weatherLoading = false;
		}
	}

	// --- Today's Deadlines ---
	let todayTasks = $derived.by(() => {
		const today = new Date();
		const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
		const endOfDay = new Date(
			today.getFullYear(),
			today.getMonth(),
			today.getDate(),
			23,
			59,
			59,
			999
		);

		return dataStore.tasks
			.filter((t) => {
				if (t.status === 'done') return false;
				if (!t.deadline_at) return false;
				const d = new Date(t.deadline_at);
				return d >= startOfDay && d <= endOfDay;
			})
			.sort((a, b) => {
				const timeA = a.time_of_day || '';
				const timeB = b.time_of_day || '';
				if (timeA && timeB) return timeA.localeCompare(timeB);
				if (timeA) return -1;
				if (timeB) return 1;
				return (a.title || '').localeCompare(b.title || '');
			});
	});

	let todayArtCalls = $derived.by(() => {
		const today = new Date();
		const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
		const endOfDay = new Date(
			today.getFullYear(),
			today.getMonth(),
			today.getDate(),
			23,
			59,
			59,
			999
		);

		return dataStore.artCalls
			.filter((a) => {
				if (a.applied) return false;
				if (!a.deadline) return false;
				const d = new Date(a.deadline);
				return d >= startOfDay && d <= endOfDay;
			})
			.sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''));
	});

	let todayDeadlines = $derived.by(() => {
		const items: DeadlineItem[] = [
			...todayTasks.map((t) => ({ kind: 'task' as const, data: t })),
			...todayArtCalls.map((a) => ({ kind: 'artcall' as const, data: a }))
		];
		return items;
	});

	// --- Chart Data ---
	let parsedData = $derived(
		rawData
			.map((d: any) => ({
				...d,
				created_at: new Date(d.created_at)
			}))
			.sort((a: any, b: any) => a.created_at.getTime() - b.created_at.getTime())
	);

	const initialMetrics = {
		mood: { label: 'Mood', color: '#8b5cf6', active: true, strokeDasharray: 'none' },
		energy: { label: 'Energy', color: '#f97316', active: true, strokeDasharray: '6 4' },
		physical: { label: 'Physical', color: '#ef4444', active: true, strokeDasharray: '2 3' },
		sleep: { label: 'Sleep', color: '#3b82f6', active: true, strokeDasharray: '12 6' },
		meals: { label: 'Meals', color: '#22c55e', active: true, strokeDasharray: '3 2 1 2' }
	};

	type MetricKey = keyof typeof initialMetrics;

	let activeMetrics = $state(initialMetrics);

	let startDate = $state('');
	let endDate = $state('');

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

	const Y_DOMAIN_MIN = 0;
	const Y_DOMAIN_MAX_AT_LEAST = 10;

	let chartCurrentMonthOnly = $state(true);

	let chartData = $derived.by(() => {
		if (!chartCurrentMonthOnly) return filteredData;
		const now = new Date();
		const currentMonth = now.getMonth();
		const currentYear = now.getFullYear();
		return filteredData.filter((d: any) => {
			return d.created_at.getMonth() === currentMonth && d.created_at.getFullYear() === currentYear;
		});
	});

	let yDomain = $derived.by(() => {
		const activeKeys = (Object.keys(activeMetrics) as MetricKey[]).filter(
			(k) => activeMetrics[k].active
		);
		if (activeKeys.length === 0) return [Y_DOMAIN_MIN, Y_DOMAIN_MAX_AT_LEAST];
		let max = 0;
		for (const d of chartData) {
			for (const key of activeKeys) {
				const val = d[key];
				if (typeof val === 'number' && val > max) max = val;
			}
		}
		const upper = Math.max(Y_DOMAIN_MAX_AT_LEAST, max * 1.1);
		return [Y_DOMAIN_MIN, upper];
	});

	const formatTime = timeFormat('%m/%d');

	let metricsDropdownOpen = $state(false);
	let activeMetricsCount = $derived(
		(Object.values(activeMetrics) as { active: boolean }[]).filter((m) => m.active).length
	);

	// --- Latest Weight ---
	let latestWeight = $derived.by(() => {
		for (let i = parsedData.length - 1; i >= 0; i--) {
			if (parsedData[i].weight != null) return parsedData[i].weight;
		}
		return null;
	});

	// --- Averages ---
	let averagesCurrentMonthOnly = $state(true);

	let averages = $derived.by(() => {
		let dataToUse = filteredData;
		if (averagesCurrentMonthOnly) {
			const now = new Date();
			const currentMonth = now.getMonth();
			const currentYear = now.getFullYear();
			dataToUse = filteredData.filter((d: any) => {
				return (
					d.created_at.getMonth() === currentMonth && d.created_at.getFullYear() === currentYear
				);
			});
		}

		const metrics = ['mood', 'energy', 'physical', 'sleep', 'meals'] as const;
		const result: Record<string, number | null> = {};

		for (const metric of metrics) {
			const values = dataToUse.map((d: any) => d[metric]).filter((v: any) => v != null);
			result[metric] =
				values.length > 0
					? Math.round((values.reduce((a: number, b: number) => a + b, 0) / values.length) * 10) /
						10
					: null;
		}

		return result;
	});

	const averageLabels: Record<string, { label: string; color: string }> = {
		mood: { label: 'Mood', color: '#8b5cf6' },
		energy: { label: 'Energy', color: '#f97316' },
		physical: { label: 'Physical', color: '#ef4444' },
		sleep: { label: 'Sleep', color: '#3b82f6' },
		meals: { label: 'Meals', color: '#22c55e' }
	};

	// --- Events / Donut ---
	let eventsCurrentMonthOnly = $state(true);

	const eventColors: Record<string, string> = {
		ihana: '#ec4899',
		calvin_day: '#a855f7',
		exercise: '#f97316',
		call_family: '#06b6d4',
		cry: '#94a3b8',
		loving: '#ef4444',
		friends: '#22c55e',
		sickness: '#eab308',
		work: '#3b82f6',
		study: '#8b5cf6',
		culture: '#14b8a6',
		art: '#f43f5e',
		music: '#d946ef',
		leisure: '#10b981'
	};

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

	// Scatter plot data: one point per (day, event) where event occurred
	function eventOccurred(d: any, key: string): boolean {
		switch (key) {
			case 'exercise':
				return !!(d.exercise_type && d.exercise_type.trim());
			case 'ihana':
				return d.ihana === true;
			case 'calvin_day':
				return d.calvin_day === true;
			case 'sickness':
				return d.sickness === true;
			case 'work':
				return !!(d.work_type && d.work_type.trim());
			case 'study':
				return !!(d.study_type && d.study_type.trim());
			case 'culture':
				return !!(d.culture_type && d.culture_type.trim());
			case 'art':
				return !!(d.art_type && d.art_type.trim());
			case 'music':
				return !!(d.music_type && d.music_type.trim());
			case 'leisure':
				return !!(d.leisure_type && d.leisure_type.trim());
			case 'call_family':
				return d.call_family === true;
			case 'cry':
				return d.cry === true;
			case 'loving':
				return d.loving === true;
			case 'friends':
				return d.friends === true;
			default:
				return false;
		}
	}

	let scatterPoints = $derived.by(() => {
		const points: { date: Date; eventKey: string }[] = [];
		let dataToUse = filteredData;
		if (eventsCurrentMonthOnly) {
			const now = new Date();
			dataToUse = filteredData.filter((d: any) => {
				const date = d.created_at;
				return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
			});
		}

		const eventKeys = Object.keys(activityStats);
		for (const d of dataToUse) {
			const date = d.created_at;
			for (const key of eventKeys) {
				if (eventOccurred(d, key)) {
					points.push({ date, eventKey: key });
				}
			}
		}
		return points;
	});

	// Always show all event types (including 0 count) for consistent layout
	const scatterEventOrder = [
		'ihana',
		'calvin_day',
		'exercise',
		'call_family',
		'cry',
		'loving',
		'friends',
		'sickness',
		'work',
		'study',
		'culture',
		'art',
		'music',
		'leisure'
	];

	let scatterEventLabels = $derived(
		Object.fromEntries(Object.entries(activityStats).map(([k, v]) => [k, v.label]))
	);

	// Events chart responsive dimensions (like Progress chart)
	let eventsChartContainerRef: HTMLDivElement | undefined = $state();
	let eventsChartSize = $state<{ width: number; height: number } | null>(null);

	function updateEventsChartSize() {
		if (!eventsChartContainerRef) return;
		const w = eventsChartContainerRef.clientWidth;
		const h = eventsChartContainerRef.clientHeight;
		if (w >= 100 && h >= 80) {
			eventsChartSize = { width: w, height: h };
		}
	}

	$effect(() => {
		const el = eventsChartContainerRef;
		if (!el) return;
		const ro = new ResizeObserver(() => updateEventsChartSize());
		ro.observe(el);
		updateEventsChartSize();
		return () => ro.disconnect();
	});

	// --- Auth ---
	onMount(() => {
		supabase.auth.getSession().then(({ data: { session: s } }) => {
			session = s;
		});

		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_event, _session) => {
			session = _session;
		});

		loadWeather();

		return () => subscription.unsubscribe();
	});

	function toggleMetric(key: string) {
		const k = key as MetricKey;
		activeMetrics[k].active = !activeMetrics[k].active;
	}

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
</script>

<div class="flex flex-1 flex-col">
	{#if session}
		<!-- Desktop: Section 1 (1/3) = weather+averages | tasks | Section 2 (2/3) = chart | events -->
		<div class="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row">
			<!-- Section 1: 1/3 width, 2 flex rows (greeting+averages | tasks) to align with chart | events -->
			<div class="flex min-w-0 min-h-0 flex-1 flex-col gap-4 lg:min-w-0 lg:flex-[1]">
				<!-- Row 1: Weather + Averages (aligns with Progress chart, space under averages is ok) -->
				<div class="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
					<!-- Weather card: no background, centered -->
					<div class="relative shrink-0 p-4 sm:p-5">
						<!-- Centered weather content -->
						<div class="flex flex-col items-center justify-center gap-2">
							{#if weatherData}
								{@const WeatherIcon = getWeatherIcon(weatherData.weatherCode, weatherData.isDay)}
								<div class="flex items-center gap-2">
									<WeatherIcon
										class="h-10 w-10 shrink-0"
										style="color: {getWeatherIconColor(weatherData.weatherCode, weatherData.isDay)}"
									/>
									<div class="flex flex-col gap-0.5">
										<span class="text-2xl font-bold text-zinc-100">{weatherData.temperature}°C</span>
										<span class="flex items-center gap-1 text-sm text-zinc-400">
											<Wind class="h-3.5 w-3.5" />
											{weatherData.windSpeed} km/h
										</span>
									</div>
								</div>
								<!-- Status and location below -->
								<div class="flex flex-col items-center gap-0.5 text-sm text-zinc-400">
									<span>{getWeatherLabel(weatherData.weatherCode)}</span>
									{#if locationName || locationCountry}
										<span class="text-zinc-500">
											{locationName}{#if locationName && locationCountry}, {/if}{locationCountry}
										</span>
									{/if}
								</div>
							{:else if weatherLoading}
								<div class="flex flex-col items-center gap-2">
									<Sun class="h-10 w-10 animate-pulse text-amber-400" />
									<span class="text-sm text-zinc-500">Loading weather...</span>
								</div>
							{:else}
								<Sun class="h-10 w-10 text-amber-400" />
							{/if}
						</div>
					</div>

					<!-- Averages (title + button outside card) - pushed to bottom to align with Progress chart -->
					<div class="mt-auto flex shrink-0 flex-col gap-2">
						<div class="flex items-center justify-between">
							<h2 class="text-lg font-semibold text-zinc-100">Averages</h2>
							<button
								onclick={() => (averagesCurrentMonthOnly = !averagesCurrentMonthOnly)}
								class="text-xs font-medium text-indigo-400 hover:text-indigo-300"
							>
								{averagesCurrentMonthOnly ? 'This Month' : 'All Time'}
							</button>
						</div>
						<div class="rounded-xl bg-zinc-900 p-4 shadow-lg">
							<div class="flex flex-wrap justify-between gap-2">
								{#each Object.entries(averageLabels) as [key, meta]}
									<div class="flex min-w-0 flex-1 flex-col items-center gap-0.5">
										<span class="text-base font-semibold text-zinc-200" style:color={meta.color}>
											{averages[key] != null ? averages[key] : '—'}
										</span>
										<span class="text-xs text-zinc-500">{meta.label}</span>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>

				<!-- Row 2: Today's Tasks (aligns with Events) -->
				<div class="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
					<h2 class="text-lg font-semibold text-zinc-100">Today's Tasks</h2>
					{#if todayDeadlines.length === 0}
						<p class="text-center text-sm text-zinc-500">No deadlines for today</p>
					{:else}
						<div class="grid grid-cols-1 gap-2">
							{#each todayDeadlines as item}
								{#if item.kind === 'task'}
									{@const task = item.data}
									{@const statusStyle = getStatusColor(task.status)}
									<div
										class="rounded-xl bg-zinc-900 px-3 py-2.5 shadow-lg transition-all hover:bg-zinc-800"
									>
										<div class="flex items-center justify-between gap-2.5">
											<div class="flex min-w-0 flex-1 items-center gap-2.5">
												<SquareCheckBig class="h-4 w-4 shrink-0 text-indigo-400" />
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
											{#if task.time_of_day}
												<span class="shrink-0 text-xs text-zinc-500">
													{task.time_of_day.slice(0, 5)}
												</span>
											{/if}
										</div>
									</div>
								{:else}
									{@const artCall = item.data}
									<div
										class="rounded-xl bg-zinc-900 px-3 py-2.5 shadow-lg transition-all hover:bg-zinc-800"
									>
										<div class="flex items-center gap-2.5">
											<Palette class="h-4 w-4 shrink-0 text-emerald-400" />
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
														<span class="text-zinc-500">&bull;</span>
														<span class="text-emerald-400">&euro;{artCall.funds}</span>
													{/if}
												</div>
											</div>
										</div>
									</div>
								{/if}
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- Section 2: 2/3 width, 2 rows -->
			<div class="flex min-h-0 min-w-0 flex-1 flex-col gap-4 lg:flex-[2]">
				<!-- Row 1: Programs metrics chart -->
				<div class="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
					{#if filteredData.length > 1}
						<!-- Header: Progress | metrics filter (left) ... This Month (right) -->
						<div class="flex items-center justify-between gap-2">
							<div class="flex items-center gap-2">
								<h2 class="text-lg font-semibold text-zinc-100">Progress</h2>
								<div class="relative">
									<button
										onclick={() => (metricsDropdownOpen = !metricsDropdownOpen)}
										class="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 shadow-sm transition-colors hover:bg-zinc-700"
									>
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
										<button
											class="fixed inset-0 z-10"
											onclick={() => (metricsDropdownOpen = false)}
											aria-label="Close dropdown"
										></button>
										<div
											class="absolute top-full left-0 z-20 mt-1 w-48 rounded-md border border-zinc-700 bg-zinc-800 py-1 shadow-lg"
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
							<button
								onclick={() => (chartCurrentMonthOnly = !chartCurrentMonthOnly)}
								class="shrink-0 text-xs font-medium text-indigo-400 hover:text-indigo-300"
								title={chartCurrentMonthOnly ? 'Show all time' : 'Show current month'}
								style={!chartCurrentMonthOnly ? `color: ${settings.getAccentLightHex()}` : ''}
							>
								{chartCurrentMonthOnly ? 'This Month' : 'All Time'}
							</button>
						</div>

						<div class="relative flex min-h-0 flex-1 flex-col rounded-xl bg-zinc-900 p-4 shadow-lg">
							<div class="relative min-h-0 flex-1">
								<LayerCake
									padding={{ top: 36, right: 15, bottom: 32, left: 30 }}
									x="created_at"
									y="mood"
									{yDomain}
									xScale={scaleTime()}
									data={chartData}
								>
									<Svg>
										<AxisX
											gridlines={false}
											ticks={chartData.length > 10 ? 5 : chartData.length}
											format={formatTime}
											tickMarks={true}
											dy={12}
										/>
										<AxisY gridlines={true} ticks={5} tickMarks={true} />
										{#each Object.entries(activeMetrics) as [key, config]}
											{#if config.active}
												<Line
													stroke={config.color}
													yAccessorKey={key}
													smoothing={settings.getChartSmoothing()}
													strokeDasharray={config.strokeDasharray ?? 'none'}
												/>
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
						</div>
					{:else}
						<div
							class="flex min-h-[200px] flex-1 items-center justify-center rounded-xl bg-zinc-900 shadow-lg"
						>
							<span class="text-zinc-500">Not enough data to display chart</span>
						</div>
					{/if}
				</div>

				<!-- Row 2: Events -->
				{#if filteredData.length > 0}
					<div class="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
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

						<div
							class="flex min-w-0 flex-1 flex-col gap-4 rounded-xl bg-zinc-900 p-4 shadow-lg sm:w-full sm:flex-row"
						>
							<!-- Chart: 2/3 width, spans full width of its flex space (responsive like Progress chart) -->
							<div class="relative flex min-h-[160px] w-full min-w-0 flex-[2] overflow-hidden">
								<div
									class="relative min-h-0 w-full min-w-0 flex-1"
									bind:this={eventsChartContainerRef}
								>
									{#if eventsChartSize}
										<EventsScatter
											points={scatterPoints}
											eventOrder={scatterEventOrder}
											{eventColors}
											eventLabels={scatterEventLabels}
											width={eventsChartSize.width}
											height={eventsChartSize.height}
										/>
									{/if}
								</div>
							</div>

							<!-- Stats: 1/3 width, 2 columns, fills its space -->
							<div
								class="grid w-full min-w-0 flex-[1] grid-cols-2 gap-x-3 gap-y-0.5 border-t border-zinc-700 pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-3"
							>
								{#each Object.entries(activityStats) as [key, stat]}
									<div class="flex items-center gap-1.5">
										<span class="shrink-0 text-xs">{stat.icon}</span>
										<span
											class="truncate text-xs {stat.count > 0 ? 'text-zinc-300' : 'text-zinc-500'}"
											>{stat.label}</span
										>
										<span
											class="ml-auto shrink-0 text-xs font-bold"
											style="color: {stat.count > 0 ? (eventColors[key] ?? '#71717a') : '#52525b'}"
										>
											{stat.count}
										</span>
									</div>
								{/each}
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
