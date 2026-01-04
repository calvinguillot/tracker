<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import type { Session } from '@supabase/supabase-js';
	import EntryModal from '$lib/components/EntryModal.svelte';
	import { Plus, Loader } from 'lucide-svelte';
	import { LayerCake, Svg, Html } from 'layercake';
	import { scaleTime } from 'd3-scale';
	import { timeFormat } from 'd3-time-format';

	import Line from '$lib/components/chart/Line.svelte';
	import AxisX from '$lib/components/chart/AxisX.svelte';
	import AxisY from '$lib/components/chart/AxisY.svelte';
	import SharedTooltip from '$lib/components/chart/SharedTooltip.svelte';

	let { data } = $props();
	let session = $state<Session | null>(null);
	let isModalOpen = $state(false);
	let isLoading = $state(true);

	let rawData = $state<any[]>([]);

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

	// Formatting
	const formatTime = timeFormat('%b %d');

	onMount(() => {
		supabase.auth.getSession().then(({ data: { session: s } }) => {
			session = s;
			if (s) fetchData();
			else isLoading = false;
		});

		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_event, _session) => {
			session = _session;
			if (_session) fetchData();
			else isLoading = false;
		});

		return () => subscription.unsubscribe();
	});

	async function fetchData() {
		isLoading = true;
		const { data: d, error } = await supabase
			.from('dailyTracking')
			.select('created_at, mood, energy, physical, sleep, meals, weight')
			.order('created_at', { ascending: true });

		if (!error && d) {
			rawData = d;
		} else if (error) {
			console.error('Error fetching data:', error);
		}
		isLoading = false;
	}

	async function handleSave(entry: any) {
		const { error } = await supabase.from('dailyTracking').insert(entry);
		if (error) {
			console.error('Error saving entry:', error);
			alert('Error saving entry: ' + error.message);
		} else {
			isModalOpen = false;
			alert('Entry saved successfully!');
			fetchData(); // Refresh data
		}
	}

	function toggleMetric(key: string) {
		const k = key as MetricKey;
		activeMetrics[k].active = !activeMetrics[k].active;
	}
</script>

<div>
	<div class="mb-6 flex items-center justify-between">
		<h2 class="text-xl font-bold text-zinc-100">Your Progress</h2>
		{#if session}
			<div class="text-sm text-zinc-400">
				{session.user.email}
			</div>
		{/if}
	</div>

	{#if isLoading}
		<div class="flex h-64 items-center justify-center">
			<Loader class="h-8 w-8 animate-spin text-indigo-500" />
		</div>
	{:else if session}
		<div class="space-y-4">
			<!-- Controls -->
			<div class="space-y-4 rounded-lg bg-zinc-800 p-4 shadow-lg">
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

			<!-- Chart -->
			{#if filteredData.length > 1}
				<div class="relative h-[400px] w-full rounded-lg bg-zinc-800 p-4 shadow-lg">
					<LayerCake
						padding={{ top: 20, right: 10, bottom: 20, left: 25 }}
						x={(d: any) => d.created_at}
						{yDomain}
						data={filteredData}
						xScale={scaleTime()}
					>
						<Svg>
							<AxisX gridlines={false} ticks={5} format={formatTime} />
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
				<div class="rounded-lg bg-zinc-800 p-8 text-center text-zinc-400 shadow-lg">
					Not enough data to display chart. Add more entries!
				</div>
			{/if}
		</div>

		<button
			onclick={() => (isModalOpen = true)}
			class="fixed right-8 bottom-8 z-50 rounded-full bg-indigo-600 p-4 text-white shadow-lg transition-transform hover:scale-105 hover:bg-indigo-500"
			aria-label="Create New Entry"
		>
			<Plus class="h-6 w-6" />
		</button>

		<EntryModal
			isOpen={isModalOpen}
			entry={null}
			onClose={() => (isModalOpen = false)}
			onSave={handleSave}
		/>
	{:else}
		<div class="py-12 text-center">
			<h2 class="text-xl font-semibold text-zinc-100">Welcome to Tracker</h2>
			<p class="mt-2 text-zinc-400">Please sign in to start tracking.</p>
		</div>
	{/if}
</div>
