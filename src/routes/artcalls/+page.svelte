<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import type { Session } from '@supabase/supabase-js';
	import { Loader, Plus, ArrowUp, ArrowDown } from 'lucide-svelte';
	import ArtCallModal from '$lib/components/ArtCallModal.svelte';
	import { showAlert, showConfirm, alertState } from '$lib/alertStore.svelte';

	type ArtCall = {
		id: number;
		created_at: string;
		name: string;
		location: string;
		type: number | null;
		funds: number | null;
		deadline: string | null;
		link: string;
		applied: boolean;
		group: boolean;
		idea: string | null;
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
	let appliedCount = $derived(artCalls.filter((call) => call.applied).length);

	// Sorting state
	type SortField = 'name' | 'funds' | 'deadline' | 'created' | 'status';
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
			} else if (sortField === 'created') {
				const dateA = new Date(a.created_at).getTime();
				const dateB = new Date(b.created_at).getTime();
				return (dateA - dateB) * modifier;
			} else if (sortField === 'status') {
				const statusA = getStatus(a.deadline).isOpen ? 0 : 1;
				const statusB = getStatus(b.deadline).isOpen ? 0 : 1;
				return (statusA - statusB) * modifier;
			}
			return 0;
		})
	);

	let activeCalls = $derived(
		sortedArtCalls.filter((c) => getStatus(c.deadline).isOpen && !c.applied)
	);
	let archivedCalls = $derived(
		sortedArtCalls.filter((c) => !getStatus(c.deadline).isOpen || c.applied)
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
			.select('id, created_at, name, location, type, funds, deadline, link, applied, group, idea')
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

	async function handleDelete(id: number) {
		const confirmed = await showConfirm(
			'Are you sure you want to delete this art call?',
			'Delete Art Call',
			{ confirmText: 'Delete', isDestructive: true }
		);

		if (!confirmed) return;

		const { error } = await supabase.from('artCalls').delete().eq('id', id);

		if (error) {
			console.error('Error deleting art call:', error);
			showAlert('Error deleting: ' + error.message, 'Error');
		} else {
			showAlert('Art call deleted successfully!', 'Success');
			fetchData();
		}
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
				text: 'text-emerald-400',
				isOpen: true
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
					text: 'text-emerald-400',
					isOpen: true
				}
			: {
					label: 'Closed',
					color: 'bg-red-500',
					bg: 'bg-red-500/10',
					text: 'text-red-400',
					isOpen: false
				};
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
		{#if session && !isModalOpen && !alertState.isOpen}
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
			{#each ['name', 'funds', 'deadline', 'created', 'status'] as field}
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
			<span class="ml-auto text-xs text-zinc-500">
				Applied {appliedCount} / {artCalls.length}
			</span>
		</div>

		{#snippet callCard(call: ArtCall)}
			{@const status = getStatus(call.deadline)}
			<li
				class={`group relative flex flex-col justify-between rounded-lg border p-4 transition-all ${
					status.isOpen
						? 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900/80'
						: 'border-zinc-800/60 bg-zinc-900/30 hover:border-zinc-700/60 hover:bg-zinc-900/40'
				}`}
			>
				<div class="flex flex-col gap-3">
					<!-- Header: Name, Location, Status -->
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<h3
									class={`truncate text-base font-bold ${
										status.isOpen ? 'text-zinc-100' : 'text-zinc-500'
									}`}
									title={call.name}
								>
									{call.name}
								</h3>
								<div
									class={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${status.bg} ${status.text} border-transparent text-center`}
								>
									{status.label}
								</div>
								{#if call.group}
									<div
										class="shrink-0 rounded-full border border-transparent bg-yellow-500/10 px-2 py-0.5 text-center text-[10px] font-medium text-yellow-500"
									>
										Group
									</div>
								{/if}
							</div>
							<div
								class={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ${
									status.isOpen ? 'text-zinc-400' : 'text-zinc-500'
								}`}
							>
								<span class="truncate">{call.location}</span>
								<span class="text-zinc-600">•</span>
								<span>{formatType(call.type)}</span>
							</div>
						</div>
						<div class="flex items-center self-center">
							{#if call.applied}
								<span class="text-base font-normal text-emerald-400">Applied</span>
							{:else}
								<span
									class={`text-base font-normal ${
										status.isOpen ? 'text-zinc-400' : 'text-zinc-500'
									}`}>Not applied</span
								>
							{/if}
						</div>
					</div>

					<!-- Idea Section -->
					{#if call.idea}
						<div class="mt-1 border-t border-zinc-800/50 pt-3">
							<p
								class={`text-sm ${status.isOpen && !call.applied ? 'text-zinc-300' : 'text-zinc-500'}`}
							>
								{call.idea}
							</p>
						</div>
					{/if}

					<!-- Details Row -->
					<div
						class="mt-1 flex items-center justify-between gap-4 border-t border-zinc-800/50 pt-3"
					>
						<div class="flex gap-6">
							<div class="flex flex-col gap-0.5">
								<span class="text-[10px] font-bold tracking-wider text-zinc-500 uppercase"
									>Funds</span
								>
								<span
									class={`text-sm font-medium ${
										status.isOpen ? 'text-emerald-400' : 'text-zinc-500'
									}`}>{formatFunds(call.funds)}</span
								>
							</div>
							<div class="flex flex-col gap-0.5">
								<span class="text-[10px] font-bold tracking-wider text-zinc-500 uppercase"
									>Deadline</span
								>
								<span class={`text-sm ${status.isOpen ? 'text-zinc-300' : 'text-zinc-500'}`}>
									{formatDate(call.deadline)}
								</span>
							</div>
						</div>

						<div class="flex items-center gap-2">
							{#if call.link}
								<a
									class={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
										status.isOpen
											? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300'
											: 'bg-zinc-800/60 text-zinc-500 hover:bg-zinc-800'
									}`}
									href={call.link}
									target="_blank"
									rel="noreferrer"
								>
									Visit Link &rarr;
								</a>
							{/if}
							<button
								onclick={() => openEdit(call)}
								class="rounded-md p-2 text-indigo-400 transition-colors hover:bg-zinc-800 hover:text-indigo-300"
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
								onclick={() => handleDelete(call.id)}
								class="rounded-md p-2 text-red-400 transition-colors hover:bg-zinc-800 hover:text-red-300"
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
						</div>
					</div>
				</div>
			</li>
		{/snippet}

		<ul class="grid grid-cols-1 gap-3">
			{#each activeCalls as call}
				{@render callCard(call)}
			{/each}
		</ul>

		{#if archivedCalls.length > 0}
			<div class="my-8 flex items-center gap-4">
				<div class="h-px flex-1 bg-zinc-800"></div>
				<span class="text-sm font-medium tracking-wider text-zinc-500 uppercase">Archived</span>
				<div class="h-px flex-1 bg-zinc-800"></div>
			</div>

			<ul class="grid grid-cols-1 gap-3">
				{#each archivedCalls as call}
					{@render callCard(call)}
				{/each}
			</ul>
		{/if}
	{/if}
</section>
