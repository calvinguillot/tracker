<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import EntryModal from '$lib/components/EntryModal.svelte';
	import { onMount } from 'svelte';
	import type { Session } from '@supabase/supabase-js';

	let { data } = $props();
	let trackingData = $state(data.dailyTracking);
	let isModalOpen = $state(false);
	let currentEntry = $state<any>(null);
	let session = $state<Session | null>(null);

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

		return () => subscription.unsubscribe();
	});

	async function fetchData() {
		const { data: d, error } = await supabase
			.from('dailyTracking')
			.select()
			.order('created_at', { ascending: false });
		if (!error && d) {
			trackingData = d;
		}
	}

	function openNew() {
		currentEntry = null;
		isModalOpen = true;
	}

	function openEdit(entry: any) {
		currentEntry = entry;
		isModalOpen = true;
	}

	async function handleDelete(id: number) {
		if (!confirm('Are you sure you want to delete this entry?')) return;

		const { error } = await supabase.from('dailyTracking').delete().eq('id', id);
		if (error) {
			alert(error.message);
		} else {
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

			if (error) alert(error.message);
			else {
				isModalOpen = false;
				fetchData();
			}
		} else {
			// Create
			const { error } = await supabase.from('dailyTracking').insert(entry);
			if (error) alert(error.message);
			else {
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
		'music_type',
		'exercise_type',
		'leisure_type',
		'family_type',
		'calvin_day',
		'dreams_type',
		'reminder_type',
		'notes'
	];
</script>

<div class="container mx-auto p-4">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold text-zinc-100">Full Tracking Table</h1>
		<div class="space-x-4 flex items-center">
			<a href="/" class="text-indigo-400 hover:text-indigo-300 transition-colors">Back to Dashboard</a>
			{#if session}
				<button
					onclick={openNew}
					class="rounded-full bg-indigo-600 p-2 text-white hover:bg-indigo-500 shadow-lg transition-transform hover:scale-105"
					aria-label="New Entry"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
				</button>
			{/if}
		</div>
	</div>

	{#if session}
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
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-zinc-400 uppercase"
								>{col.replace('_', ' ')}</th
							>
						{/each}
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-800 bg-zinc-900">
					{#each trackingData as entry}
						<tr class="hover:bg-zinc-800/50 transition-colors">
							<td class="sticky left-0 z-10 bg-zinc-900 px-6 py-4 font-medium whitespace-nowrap text-zinc-200"
								>{entry.created_at}</td
							>
							<td
								class="sticky left-[100px] z-10 space-x-2 border-r border-zinc-800 bg-zinc-900 px-6 py-4 whitespace-nowrap shadow-[4px_0_8px_-4px_rgba(0,0,0,0.3)]"
							>
								<button
									onclick={() => openEdit(entry)}
									class="text-indigo-400 hover:text-indigo-300 transition-colors"
									aria-label="Edit"
								>
									<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
									</svg>
								</button>
								<button
									onclick={() => handleDelete(entry.id)}
									class="text-red-400 hover:text-red-300 transition-colors"
									aria-label="Delete"
								>
									<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
									</svg>
								</button>
							</td>
							{#each columns as col}
								<td
									class="max-w-xs truncate px-6 py-4 text-sm whitespace-nowrap text-zinc-400"
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
</div>
