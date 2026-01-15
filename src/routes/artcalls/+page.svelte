<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import type { Session } from '@supabase/supabase-js';
	import { Loader, Plus, ArrowUp, ArrowDown } from 'lucide-svelte';
	import ArtCallModal from '$lib/components/ArtCallModal.svelte';
	import { showAlert } from '$lib/alertStore.svelte';

	type ArtCall = {
		id: number;
		created_at: string;
		name: string;
		location: string;
		type: number | null;
		funds: number | null;
		deadline: string | null;
		link: string;
	};

	const typeLabels: Record<number, string> = {
		1: 'Open Call',
		2: 'Residency',
		3: 'Grant',
		4: 'Job Offer',
		5: 'Other'
	};

	let session = $state<Session | null>(null);
	let isLoading = $state(true);
	let artCalls = $state<ArtCall[]>([]);
	let isModalOpen = $state(false);
	let currentEntry = $state<ArtCall | null>(null);

	// Sorting state
	type SortField = 'name' | 'funds' | 'deadline';
	let sortField = $state<SortField>('deadline');
	let sortDirection = $state<'asc' | 'desc'>('asc');

	let sortedArtCalls = $derived(
		[...artCalls].sort((a, b) => {
			const modifier = sortDirection === 'asc' ? 1 : -1;

			if (sortField === 'name') {
				return a.name.localeCompare(b.name) * modifier;
			} else if (sortField === 'funds') {
				return ((a.funds ?? 0) - (b.funds ?? 0)) * modifier;
			} else if (sortField === 'deadline') {
				// Handle null deadlines (e.g. treat as far future or past?)
				// Let's treat null as "no deadline" -> far future if asc, far past if desc?
				// Actually, just simple string compare works for ISO dates, but handling nulls explicitly is better.
				const dateA = a.deadline
					? new Date(a.deadline).getTime()
					: modifier === 1
						? Infinity
						: -Infinity;
				const dateB = b.deadline
					? new Date(b.deadline).getTime()
					: modifier === 1
						? Infinity
						: -Infinity;
				return (dateA - dateB) * modifier;
			}
			return 0;
		})
	);

	function toggleSort(field: SortField) {
		if (sortField === field) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortField = field;
			sortDirection = 'asc'; // Default to asc for new field
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
		console.log('Fetching art calls...');
		const { data: d, error } = await supabase
			.from('artCalls')
			.select('id, created_at, name, location, type, funds, deadline, link')
			.order('deadline', { ascending: true });

		if (!error && d) {
			artCalls = d;
		} else if (error) {
			console.error('Error fetching art calls:', error);
		}

		isLoading = false;
	}

	function openNew() {
		currentEntry = null;
		isModalOpen = true;
	}

	function openEdit(entry: ArtCall) {
		currentEntry = entry;
		isModalOpen = true;
	}

	async function handleSave(entry: any) {
		const { id, ...payload } = entry;
		// If currentEntry exists, it's an update (need ID)
		// But the modal returns the formData which doesn't have ID.
		// We should check currentEntry to decide if update or insert.

		if (currentEntry) {
			// Update
			const { error } = await supabase.from('artCalls').update(payload).eq('id', currentEntry.id);

			if (error) {
				console.error('Error updating art call:', error);
				showAlert('Error updating: ' + error.message, 'Error');
			} else {
				showAlert('Art call updated successfully!', 'Success');
				isModalOpen = false;
				fetchData();
			}
		} else {
			// Insert
			const { error } = await supabase.from('artCalls').insert(payload);

			if (error) {
				console.error('Error saving art call:', error);
				showAlert('Error saving: ' + error.message, 'Error');
			} else {
				showAlert('Art call saved successfully!', 'Success');
				isModalOpen = false;
				fetchData();
			}
		}
	}

	const formatType = (value: number | null) => typeLabels[value ?? 0] ?? 'Unknown';
	const formatFunds = (value: number | null) => (value === null ? '—' : `€${value}`);
	const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString() : '—');

	function getStatus(deadline: string | null) {
		if (!deadline) {
			return {
				label: 'Open',
				color: 'bg-emerald-500',
				bg: 'bg-emerald-500/10',
				text: 'text-emerald-400'
			};
		}

		const d = new Date(deadline);
		// Reset time to start of day for accurate comparison?
		// Or just raw comparison. Usually deadlines are effectively end of day.
		// Let's treat today as still open.
		const now = new Date();
		now.setHours(0, 0, 0, 0);
		d.setHours(0, 0, 0, 0);

		const isOpen = d >= now;

		return isOpen
			? {
					label: 'Open',
					color: 'bg-emerald-500',
					bg: 'bg-emerald-500/10',
					text: 'text-emerald-400'
				}
			: { label: 'Closed', color: 'bg-red-500', bg: 'bg-red-500/10', text: 'text-red-400' };
	}
</script>

<ArtCallModal
	isOpen={isModalOpen}
	entry={currentEntry}
	onClose={() => (isModalOpen = false)}
	onSave={handleSave}
/>

<section class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<h2 class="text-lg font-bold text-zinc-100">Art Calls</h2>
		{#if session}
			<button
				onclick={openNew}
				class="fixed right-8 bottom-8 z-50 rounded-full bg-indigo-600 p-4 text-white shadow-lg transition-transform hover:scale-105 hover:bg-indigo-500"
				aria-label="New Art Call"
			>
				<Plus class="h-6 w-6" />
			</button>
		{/if}
	</div>

	{#if isLoading && session !== null}
		<div class="flex h-48 items-center justify-center">
			<Loader class="h-6 w-6 animate-spin text-indigo-400" />
		</div>
	{:else if !session}
		<div class="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-400">
			Sign in to view art calls.
		</div>
	{:else if artCalls.length === 0}
		<div class="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-400">
			No art calls yet.
		</div>
	{:else}
		<!-- Sorting Controls -->
		<div class="mb-4 flex flex-wrap items-center gap-4 text-sm">
			<span class="text-zinc-500">Sort by:</span>
			{#each ['name', 'funds', 'deadline'] as field}
				<button
					class={`flex items-center gap-1 rounded-md px-3 py-1.5 transition-colors ${sortField === field ? 'bg-indigo-500/20 text-indigo-300' : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800'}`}
					onclick={() => toggleSort(field as SortField)}
				>
					<span class="capitalize">{field}</span>
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

		<ul class="grid grid-cols-1 gap-3">
			{#each sortedArtCalls as call}
				{@const status = getStatus(call.deadline)}
				<li
					class="group relative flex flex-col justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900/80"
				>
					<div class="flex flex-col gap-3">
						<!-- Header: Name, Location, Status -->
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<h3 class="truncate text-base font-bold text-zinc-100" title={call.name}>
									{call.name}
								</h3>
								<div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
									<span class="truncate">{call.location}</span>
									<span class="text-zinc-600">•</span>
									<span>{formatType(call.type)}</span>
								</div>
							</div>
							<div
								class={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${status.bg} ${status.text} border-transparent`}
							>
								{status.label}
							</div>
						</div>

						<!-- Details Row -->
						<div
							class="mt-1 flex items-center justify-between gap-4 border-t border-zinc-800/50 pt-3"
						>
							<div class="flex gap-6">
								<div class="flex flex-col gap-0.5">
									<span class="text-[10px] font-bold tracking-wider text-zinc-500 uppercase"
										>Funds</span
									>
									<span class="text-sm font-medium text-emerald-400">{formatFunds(call.funds)}</span
									>
								</div>
								<div class="flex flex-col gap-0.5">
									<span class="text-[10px] font-bold tracking-wider text-zinc-500 uppercase"
										>Deadline</span
									>
									<span class="text-sm text-zinc-300">{formatDate(call.deadline)}</span>
								</div>
							</div>

							{#if call.link}
								<a
									class="rounded-md bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-400 transition-colors hover:bg-indigo-500/20 hover:text-indigo-300"
									href={call.link}
									target="_blank"
									rel="noreferrer"
								>
									Visit Link &rarr;
								</a>
							{/if}
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>
