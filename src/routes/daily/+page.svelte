<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import DailyGridCard from './DailyGridCard.svelte';
	import EntryModal from '$lib/components/EntryModal.svelte';
	import ViewModal from '$lib/components/ViewModal.svelte';
	import { onMount, untrack } from 'svelte';
	import type { Session } from '@supabase/supabase-js';
	import { Plus, Loader, ArrowUp, ArrowDown, List, LayoutGrid } from 'lucide-svelte';
	import { showAlert, showConfirm, alertState } from '$lib/alertStore.svelte';
	import { settings } from '$lib/settingsStore.svelte';

	let { data } = $props();
	let trackingData = $state<any[]>(untrack(() => data.dailyTracking));
	let isModalOpen = $state(false);
	let isViewModalOpen = $state(false);
	let currentEntry = $state<any>(null);
	let session = $state<Session | null>(null);
	let isLoading = $state(true);

	// View & Sorting
	let viewMode = $state<'list' | 'grid'>('list');
	type SortField = 'created_at' | 'mood' | 'energy' | 'physical' | 'sleep' | 'meals' | 'weight';
	let sortField = $state<SortField>('created_at');
	let sortDirection = $state<'asc' | 'desc'>('desc');

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

	function toggleSort(field: SortField) {
		if (sortField === field) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortField = field;
			sortDirection = 'desc';
		}
	}

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
			.select()
			.order('created_at', { ascending: false });
		if (!error && d) {
			trackingData = d;
		}
		isLoading = false;
	}

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
			fetchData();
		}
	}

	async function handleSave(entry: any) {
		if (currentEntry) {
			// Update
			const { id, ...updates } = entry;
			const { error } = await supabase
				.from('dailyTracking')
				.update(updates)
				.eq('id', currentEntry.id);

			if (error) showAlert(error.message, 'Error');
			else {
				showAlert('Entry updated successfully', 'Success');
				isModalOpen = false;
				fetchData();
			}
		} else {
			// Create
			const { error } = await supabase.from('dailyTracking').insert(entry);
			if (error) showAlert(error.message, 'Error');
			else {
				showAlert('Entry created successfully', 'Success');
				isModalOpen = false;
				fetchData();
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

<div>
	<div class="mb-6 flex items-center justify-between">
		<h2 class="hidden text-lg font-bold text-zinc-100 md:block">Daily</h2>
		{#if session && !isModalOpen && !isViewModalOpen && !alertState.isOpen}
			<button
				onclick={openNew}
				class="fixed right-8 bottom-8 z-50 rounded-full p-4 text-white shadow-lg transition-all hover:scale-105 hover:brightness-110"
				style="background-color: {settings.getAccentHex()}"
				aria-label="New Entry"
			>
				<Plus class="h-6 w-6" />
			</button>
		{/if}
	</div>

	{#if isLoading}
		<div class="flex h-64 items-center justify-center">
			<Loader class="h-8 w-8 animate-spin text-indigo-500" />
		</div>
	{:else if session}
		<!-- Controls -->
		<div class="mb-6 flex flex-wrap items-center justify-between gap-4 text-sm">
			<div class="flex flex-wrap items-center gap-4">
				<span class="text-zinc-500">Sort by:</span>
				{#each ['date', 'mood', 'energy', 'physical', 'sleep', 'meals', 'weight'] as label}
					{@const field = label === 'date' ? 'created_at' : label}
					<button
						class={`flex items-center gap-1 rounded-md px-3 py-1.5 transition-colors ${sortField === field ? 'bg-indigo-500/20 text-indigo-300' : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800'}`}
						onclick={() => toggleSort(field as SortField)}
					>
						<span class="capitalize">{label}</span>
						{#if sortField === field}
							{#if sortDirection === 'asc'}
								<ArrowUp class="h-3 w-3" />
							{:else}
								<ArrowDown class="h-3 w-3" />
							{/if}
						{/if}
					</button>
				{/each}
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
		{:else}
			<div
				class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
			>
				{#each sortedTrackingData as entry}
					<DailyGridCard {entry} onView={openView} />
				{/each}
			</div>
		{/if}
	{:else}
		<p class="text-center text-zinc-500">Please sign in to view tracking data.</p>
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
</div>
