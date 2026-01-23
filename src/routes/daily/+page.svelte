<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import EntryModal from '$lib/components/EntryModal.svelte';
	import ViewModal from '$lib/components/ViewModal.svelte';
	import { onMount, untrack } from 'svelte';
	import type { Session } from '@supabase/supabase-js';
	import { Plus, Loader } from 'lucide-svelte';
	import { showAlert, showConfirm, alertState } from '$lib/alertStore.svelte';

	let { data } = $props();
	let trackingData = $state<any[]>(untrack(() => data.dailyTracking));
	let isModalOpen = $state(false);
	let isViewModalOpen = $state(false);
	let currentEntry = $state<any>(null);
	let session = $state<Session | null>(null);
	let isLoading = $state(true);

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
		'sex',
		'notes'
	];
</script>

<div>
	<div class="mb-6 flex items-center justify-between">
		<h2 class="text-lg font-bold text-zinc-100">Daily</h2>
		{#if session && !isModalOpen && !isViewModalOpen && !alertState.isOpen}
			<button
				onclick={openNew}
				class="fixed right-8 bottom-8 z-50 rounded-full bg-indigo-600 p-4 text-white shadow-lg transition-transform hover:scale-105 hover:bg-indigo-500"
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
					{#each trackingData as entry}
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
									class="text-zinc-400 transition-colors hover:text-zinc-200 md:hidden"
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
		<p class="text-center text-zinc-500">Please sign in to view tracking data.</p>
	{/if}

	<EntryModal
		isOpen={isModalOpen}
		entry={currentEntry}
		onClose={() => (isModalOpen = false)}
		onSave={handleSave}
	/>

	<ViewModal
		isOpen={isViewModalOpen}
		entry={currentEntry}
		onClose={() => (isViewModalOpen = false)}
	/>
</div>
