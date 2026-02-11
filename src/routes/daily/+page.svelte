<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import DailyGridCard from './DailyGridCard.svelte';
	import EntryModal from '$lib/components/EntryModal.svelte';
	import ViewModal from '$lib/components/ViewModal.svelte';
	import { onMount, untrack } from 'svelte';
	import type { Session } from '@supabase/supabase-js';
	import {
		Plus,
		LoaderCircle,
		ArrowUp,
		ArrowDown,
		List,
		LayoutGrid,
		CalendarDays,
		ChevronLeft,
		ChevronRight
	} from 'lucide-svelte';
	import { showAlert, showConfirm, alertState } from '$lib/alertStore.svelte';
	import { settings } from '$lib/settingsStore.svelte';
	import { dataStore } from '$lib/dataStore.svelte';

	let { data } = $props();
	let trackingData = $derived(dataStore.dailyTracking);
	let isLoading = $derived(dataStore.isLoading);
	let isModalOpen = $state(false);
	let isViewModalOpen = $state(false);
	let currentEntry = $state<any>(null);
	let session = $state<Session | null>(null);

	// View & Sorting
	let viewMode = $state<'grid' | 'list' | 'heatmap'>('grid');
	type SortField = 'created_at' | 'mood' | 'energy' | 'physical' | 'sleep' | 'meals' | 'weight';
	let sortField = $state<SortField>('created_at');
	let sortDirection = $state<'asc' | 'desc'>('desc');

	// Heatmap State
	let currentYear = $state(new Date().getFullYear());
	let selectedMetric = $state<string>('work_type');

	let entriesByDate = $derived.by(() => {
		const map = new Map();
		trackingData.forEach((entry) => {
			if (entry.created_at) {
				const dateKey = entry.created_at.split('T')[0];
				map.set(dateKey, entry);
			}
		});
		return map;
	});

	// Helper for Heatmap
	function getDaysInMonth(year: number, month: number) {
		const date = new Date(year, month, 1);
		const days = [];
		while (date.getMonth() === month) {
			days.push(new Date(date));
			date.setDate(date.getDate() + 1);
		}
		return days;
	}

	function getMonthGrid(year: number, month: number) {
		const days = getDaysInMonth(year, month);
		const firstDay = days[0].getDay(); // 0 = Sun, 1 = Mon
		const offset = firstDay === 0 ? 6 : firstDay - 1; // Make Mon = 0
		const grid = Array(offset).fill(null).concat(days);
		return grid;
	}

	function getMetricValue(entry: any, metric: string) {
		if (!entry) return 0;
		const val = entry[metric];

		if (
			metric === 'weight' ||
			metric === 'mood' ||
			metric === 'energy' ||
			metric === 'physical' ||
			metric === 'sleep' ||
			metric === 'meals'
		) {
			// Numeric fields, check if not null
			return val !== null ? 1 : 0;
		}

		if (typeof val === 'boolean') return val ? 1 : 0;
		if (Array.isArray(val)) return val.length > 0 ? 1 : 0;
		// String (comma separated) or others
		if (typeof val === 'string' && val.length > 0) return 1;
		return 0;
	}

	function getLocalDateString(date: Date): string {
		const y = date.getFullYear();
		const m = String(date.getMonth() + 1).padStart(2, '0');
		const d = String(date.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}

	function getCellColor(date: Date, metric: string) {
		const dateStr = getLocalDateString(date);
		const entry = entriesByDate.get(dateStr);

		if (!entry) return ''; // No entry - transparent, card background shows through

		const hasValue = getMetricValue(entry, metric) > 0;

		if (hasValue) {
			// Use accent color for true values
			const hex = settings.getAccentHex();
			const r = parseInt(hex.slice(1, 3), 16);
			const g = parseInt(hex.slice(3, 5), 16);
			const b = parseInt(hex.slice(5, 7), 16);
			return `background-color: rgba(${r}, ${g}, ${b}, 0.6)`;
		} else {
			return 'bg-zinc-700'; // Entry exists but metric is false
		}
	}

	const booleanMetrics = [
		'cry',
		'friends',
		'loving',
		'ihana',
		'call_family',
		'calvin_day',
		'sickness'
	];

	const typeMetrics = [
		'work_type',
		'study_type',
		'culture_type',
		'art_type',
		'music_type',
		'exercise_type',
		'leisure_type'
	];

	let sortedTrackingData = $derived(
		[...trackingData].sort((a, b) => {
			const modifier = sortDirection === 'asc' ? 1 : -1;

			if (sortField === 'created_at') {
				const dateA = new Date(a.created_at).getTime();
				const dateB = new Date(b.created_at).getTime();
				return (dateA - dateB) * modifier;
			} else {
				// Handle numeric/nullable fields
				const valA = a[sortField] ?? -999;
				const valB = b[sortField] ?? -999;
				return (valA - valB) * modifier;
			}
		})
	);

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

	function openNew() {
		currentEntry = null;
		isModalOpen = true;
	}

	function openEdit(entry: any) {
		currentEntry = entry;
		isModalOpen = true;
	}

	function openView(entry: any) {
		currentEntry = entry;
		isViewModalOpen = true;
	}

	async function handleDelete(id: number) {
		const confirmed = await showConfirm(
			'Are you sure you want to delete this entry?',
			'Delete Entry',
			{ confirmText: 'Delete', isDestructive: true }
		);

		if (!confirmed) return;

		const { error } = await supabase.from('dailyTracking').delete().eq('id', id);
		if (error) {
			showAlert(error.message, 'Error');
		} else {
			showAlert('Entry deleted successfully', 'Success');
			dataStore.deleteDailyEntry(id);
		}
	}

	async function handleSave(entry: any) {
		if (currentEntry) {
			// Update
			const { id, ...updates } = entry;
			const { data, error } = await supabase
				.from('dailyTracking')
				.update(updates)
				.eq('id', currentEntry.id)
				.select()
				.single();

			if (error) showAlert(error.message, 'Error');
			else {
				showAlert('Entry updated successfully', 'Success');
				isModalOpen = false;
				if (data) dataStore.updateDailyEntry(data);
			}
		} else {
			// Create
			const { data, error } = await supabase.from('dailyTracking').insert(entry).select().single();
			if (error) showAlert(error.message, 'Error');
			else {
				showAlert('Entry created successfully', 'Success');
				isModalOpen = false;
				if (data) dataStore.addDailyEntry(data);
			}
		}
	}

	const columns = [
		'mood',
		'energy',
		'physical',
		'sleep',
		'meals',
		'weight',
		'sickness',
		'work_type',
		'study_type',
		'culture_type',
		'art_type',
		'music_type',
		'exercise_type',
		'leisure_type',
		'calvin_day',
		'ihana',
		'call_family',
		'cry',
		'loving',
		'friends',
		'notes',
		'image'
	];
</script>

<section>
	<div class="flex flex-wrap items-center justify-between gap-4">
		{#if session && !isModalOpen && !isViewModalOpen && !alertState.isOpen}
			<button
				onclick={openNew}
				class="fixed right-8 bottom-24 z-50 rounded-full p-4 shadow-lg/30 drop-shadow-lg backdrop-blur-md transition-all hover:scale-110 hover:brightness-110 md:right-16 md:bottom-16"
				style="--accent-color: {settings.getAccentLightHex()}; background-color: {settings.getAccentHex()}/50"
				aria-label="New Entry"
			>
				<Plus class="h-6 w-6 text-(--accent-color)" />
			</button>
		{/if}
	</div>

	{#if !session}
		<p class="text-center text-zinc-500">Please sign in to view tracking data.</p>
	{:else if isLoading}
		<div class="flex flex-1 items-center justify-center p-8">
			<LoaderCircle class="h-8 w-8 animate-spin text-zinc-400" />
		</div>
	{:else}
		<!-- Controls -->
		<div class="mb-4 flex flex-wrap items-center justify-between gap-4 text-sm">
			<div class="flex flex-wrap items-center gap-4">
				{#if viewMode === 'heatmap'}
					<div class="flex flex-wrap items-center gap-3">
						<!-- Metric Selector -->
						<select
							bind:value={selectedMetric}
							class="cursor-pointer rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 shadow-sm outline-none focus:border-indigo-500 focus:ring-indigo-500"
						>
							<optgroup label="Metrics">
								{#each booleanMetrics as metric}
									<option value={metric}
										>{metric.charAt(0).toUpperCase() + metric.slice(1).replace('_', ' ')}</option
									>
								{/each}
							</optgroup>
							<optgroup label="Activity Types">
								{#each typeMetrics as metric}
									<option value={metric}
										>{metric.replace('_type', '').charAt(0).toUpperCase() +
											metric.replace('_type', '').slice(1)}</option
									>
								{/each}
							</optgroup>
						</select>

						<!-- Navigation -->
						<div class="flex items-center gap-2">
							<button
								onclick={() => currentYear--}
								class="flex items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 p-1.5 text-zinc-400 shadow-sm transition-colors hover:bg-zinc-700 hover:text-zinc-100"
							>
								<ChevronLeft class="h-4 w-4" />
							</button>
							<span class="min-w-[80px] text-center font-medium text-zinc-200">
								{currentYear}
							</span>
							<button
								onclick={() => currentYear++}
								class="flex items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 p-1.5 text-zinc-400 shadow-sm transition-colors hover:bg-zinc-700 hover:text-zinc-100"
							>
								<ChevronRight class="h-4 w-4" />
							</button>
						</div>
					</div>
				{:else}
					<div class="flex items-center gap-2">
						<!-- <span class="text-zinc-500">Sort by:</span> -->
						<select
							bind:value={sortField}
							class="cursor-pointer rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 shadow-sm outline-none focus:border-indigo-500 focus:ring-indigo-500"
						>
							{#each ['date', 'mood', 'energy', 'physical', 'sleep', 'meals', 'weight'] as label}
								{@const field = label === 'date' ? 'created_at' : label}
								<option value={field}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>
							{/each}
						</select>
						<button
							class="flex items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 p-1.5 text-zinc-400 shadow-sm transition-colors hover:bg-zinc-700 hover:text-zinc-100"
							onclick={() => (sortDirection = sortDirection === 'asc' ? 'desc' : 'asc')}
							aria-label="Toggle sort order"
						>
							{#if sortDirection === 'asc'}
								<ArrowUp class="h-4 w-4" />
							{:else}
								<ArrowDown class="h-4 w-4" />
							{/if}
						</button>
					</div>
				{/if}
			</div>

			<!-- View Toggle -->
			<div class="flex items-center rounded-lg bg-zinc-800/50 p-1">
				<button
					class={`rounded-md p-1.5 transition-all ${viewMode === 'list' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-300'}`}
					onclick={() => (viewMode = 'list')}
					aria-label="List View"
				>
					<List class="h-4 w-4" />
				</button>
				<button
					class={`rounded-md p-1.5 transition-all ${viewMode === 'grid' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-300'}`}
					onclick={() => (viewMode = 'grid')}
					aria-label="Grid View"
				>
					<LayoutGrid class="h-4 w-4" />
				</button>
				<button
					class={`rounded-md p-1.5 transition-all ${viewMode === 'heatmap' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-300'}`}
					onclick={() => (viewMode = 'heatmap')}
					aria-label="Heatmap View"
				>
					<CalendarDays class="h-4 w-4" />
				</button>
			</div>
		</div>

		{#if viewMode === 'list'}
			<div class="overflow-x-auto rounded-lg border border-zinc-800 shadow">
				<table class="min-w-full divide-y divide-zinc-800">
					<thead class="bg-zinc-800">
						<tr>
							<th
								class="sticky left-0 z-10 bg-zinc-800 px-6 py-3 text-left text-xs font-medium tracking-wider text-zinc-400 uppercase"
								>Date</th
							>
							<th
								class="sticky left-[100px] z-10 bg-zinc-800 px-6 py-3 text-left text-xs font-medium tracking-wider text-zinc-400 uppercase"
								>Actions</th
							>
							{#each columns as col}
								<th
									class="hidden px-6 py-3 text-left text-xs font-medium tracking-wider text-zinc-400 uppercase md:table-cell"
									>{col.replace('_', ' ')}</th
								>
							{/each}
						</tr>
					</thead>
					<tbody class="divide-y divide-zinc-800 bg-zinc-900">
						{#each sortedTrackingData as entry}
							<tr class="transition-colors hover:bg-zinc-800/50">
								<td
									class="sticky left-0 z-10 bg-zinc-900 px-6 py-4 font-medium whitespace-nowrap text-zinc-200"
									>{entry.created_at}</td
								>
								<td
									class="sticky left-[100px] z-10 space-x-2 border-r border-zinc-800 bg-zinc-900 px-6 py-4 whitespace-nowrap shadow-[4px_0_8px_-4px_rgba(0,0,0,0.3)]"
								>
									<button
										onclick={() => openView(entry)}
										class="text-zinc-400 transition-colors hover:text-zinc-200"
										aria-label="View Details"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-5 w-5"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
											/>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
											/>
										</svg>
									</button>
									<button
										onclick={() => openEdit(entry)}
										class="text-indigo-400 transition-colors hover:text-indigo-300"
										aria-label="Edit"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-5 w-5"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
											/>
										</svg>
									</button>
									<button
										onclick={() => handleDelete(entry.id)}
										class="text-red-400 transition-colors hover:text-red-300"
										aria-label="Delete"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-5 w-5"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
											/>
										</svg>
									</button>
								</td>
								{#each columns as col}
									<td
										class="hidden max-w-xs truncate px-6 py-4 text-sm whitespace-nowrap text-zinc-400 md:table-cell"
										title={entry[col]}
									>
										{#if typeof entry[col] === 'boolean'}
											{entry[col] ? 'Yes' : 'No'}
										{:else if col === 'image'}
											{entry[col] ? 'Yes' : 'No'}
										{:else}
											{entry[col] ?? '-'}
										{/if}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else if viewMode === 'heatmap'}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each Array.from({ length: 12 }, (_, i) => i) as monthIndex}
					<div class="flex flex-col gap-1">
						<h3 class="mb-2 text-sm font-medium text-zinc-400">
							{new Date(currentYear, monthIndex).toLocaleString('default', {
								month: 'long'
							})}
						</h3>
						<div
							class="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2 transition-colors hover:border-zinc-700"
						>
							<!-- Day Headers -->
							<div class="mb-1 grid grid-cols-7 gap-1">
								{#each ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as day, i}
									<div class="text-center text-sm {i >= 5 ? 'text-zinc-600' : 'text-zinc-500'}">
										{day}
									</div>
								{/each}
							</div>

							<!-- Day Grid -->
							<div class="grid grid-cols-7 gap-1">
								{#each getMonthGrid(currentYear, monthIndex) as date}
									{#if date}
										{@const isWeekend = date.getDay() === 0 || date.getDay() === 6}
										{@const today = new Date()}
										{@const isToday =
											date.getFullYear() === today.getFullYear() &&
											date.getMonth() === today.getMonth() &&
											date.getDate() === today.getDate()}
										<button
											class="flex aspect-square w-full items-center justify-center rounded-md border-2 text-sm font-medium transition-colors hover:brightness-110 {isToday
												? 'border-white/80'
												: 'border-transparent'} {isWeekend
												? 'text-zinc-400/60'
												: 'text-zinc-300/70'}"
											style={getCellColor(date, selectedMetric)}
											title={`${date.toDateString()}: ${entriesByDate.get(getLocalDateString(date)) ? (getMetricValue(entriesByDate.get(getLocalDateString(date)), selectedMetric) ? 'Yes' : 'No') : 'No Entry'}`}
											onclick={() => {
												const entry = entriesByDate.get(getLocalDateString(date));
												if (entry) openView(entry);
											}}
										>
											{date.getDate()}
										</button>
									{:else}
										<div class="aspect-square w-full"></div>
									{/if}
								{/each}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div
				class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
			>
				{#each sortedTrackingData as entry}
					<DailyGridCard {entry} onView={openView} />
				{/each}
			</div>
		{/if}
	{/if}

	<EntryModal
		isOpen={isModalOpen}
		entry={currentEntry}
		userId={session?.user?.id}
		onClose={() => (isModalOpen = false)}
		onSave={handleSave}
	/>

	<ViewModal
		isOpen={isViewModalOpen}
		entry={currentEntry}
		onClose={() => (isViewModalOpen = false)}
	/>
</section>
