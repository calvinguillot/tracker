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
		<h1 class="text-2xl font-bold">Full Tracking Table</h1>
		<div class="space-x-4">
			<a href="/" class="text-indigo-600 hover:text-indigo-500">Back to Dashboard</a>
			{#if session}
				<button
					onclick={openNew}
					class="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500">New Entry</button
				>
			{/if}
		</div>
	</div>

	{#if session}
		<div class="overflow-x-auto rounded-lg border border-gray-200 shadow">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th
							class="sticky left-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>Date</th
						>
						<th
							class="sticky left-[100px] z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>Actions</th
						>
						{#each columns as col}
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>{col.replace('_', ' ')}</th
							>
						{/each}
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white">
					{#each trackingData as entry}
						<tr class="hover:bg-gray-50">
							<td class="sticky left-0 z-10 bg-white px-6 py-4 font-medium whitespace-nowrap"
								>{entry.created_at}</td
							>
							<td
								class="sticky left-[100px] z-10 space-x-2 border-r border-gray-100 bg-white px-6 py-4 whitespace-nowrap shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]"
							>
								<button
									onclick={() => openEdit(entry)}
									class="font-medium text-indigo-600 hover:text-indigo-900">Edit</button
								>
								<button
									onclick={() => handleDelete(entry.id)}
									class="font-medium text-red-600 hover:text-red-900">Delete</button
								>
							</td>
							{#each columns as col}
								<td
									class="max-w-xs truncate px-6 py-4 text-sm whitespace-nowrap text-gray-500"
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
		<p class="text-center text-gray-500">Please sign in to view tracking data.</p>
	{/if}

	<EntryModal
		isOpen={isModalOpen}
		entry={currentEntry}
		onClose={() => (isModalOpen = false)}
		onSave={handleSave}
	/>
</div>
