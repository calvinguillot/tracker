<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import type { Session } from '@supabase/supabase-js';
	import { Loader, Plus, ArrowUp, ArrowDown } from 'lucide-svelte';
	import ArtCallModal from '$lib/components/ArtCallModal.svelte';
	import { showAlert, showConfirm, alertState } from '$lib/alertStore.svelte';
	import { settings } from '$lib/settingsStore.svelte';

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

	async function handleDeleteFromModal(id: number) {
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
			isModalOpen = false;
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

	const formatType = (value: number | null) => settings.getCallTypeLabel(value);
	const formatFunds = (value: number | null) => (value === null ? '—' : `€${value}`);
	const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString() : '—');
	function truncatePreview(text: string | null, max = 50) {
		if (!text) return '';
		return text.length > max ? text.slice(0, max) + '...' : text;
	}

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
	onDelete={handleDeleteFromModal}
/>

<section>
	<div class="flex flex-wrap items-center justify-between gap-4">
		{#if session && !isModalOpen && !alertState.isOpen}
			<button
				onclick={openNew}
				class="fixed right-8 bottom-24 z-50 rounded-full p-4 shadow-lg/30 drop-shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:brightness-110 md:right-16 md:bottom-16"
				style="--accent-color: {settings.getAccentLightHex()}; background-color: {settings.getAccentHex()}/50"
				aria-label="New Art Call"
			>
				<Plus class="h-6 w-6 text-(--accent-color)" />
			</button>
		{/if}
	</div>

	{#if isLoading && session !== null}
		<div class="flex h-48 items-center justify-center">
			<Loader class="h-6 w-6 animate-spin" style="color: {settings.getAccentHex()}" />
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
			<div class="flex items-center gap-2">
				<!-- <span class="text-zinc-500">Sort by:</span> -->
				<select
					bind:value={sortField}
					class="cursor-pointer rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 shadow-sm outline-none focus:border-indigo-500 focus:ring-indigo-500"
				>
					{#each ['name', 'funds', 'deadline', 'created', 'status'] as field}
						<option value={field}>{field.charAt(0).toUpperCase() + field.slice(1)}</option>
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
			<span class="ml-auto text-xs text-zinc-500">
				Applied {appliedCount} / {artCalls.length}
			</span>
		</div>

		{#snippet callCard(call: ArtCall)}
			{@const status = getStatus(call.deadline)}
			<button
				type="button"
				class={`group relative flex w-full cursor-pointer flex-col justify-between rounded-lg border p-4 text-left transition-all ${
					status.isOpen
						? 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900/80'
						: 'border-zinc-800/60 bg-zinc-900/30 hover:border-zinc-700/60 hover:bg-zinc-900/40'
				}`}
				onclick={() => openEdit(call)}
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
								{truncatePreview(call.idea)}
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

						{#if call.link}
							<a
								class={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
									status.isOpen ? '' : 'bg-zinc-800/60 text-zinc-500 hover:bg-zinc-800'
								}`}
								style={status.isOpen
									? `--btn-bg: ${settings.getAccentHex()}1a; --btn-text: ${settings.getAccentLightHex()}; --btn-bg-hover: ${settings.getAccentHex()}33;`
									: ''}
								class:text-[var(--btn-text)]={status.isOpen}
								class:bg-[var(--btn-bg)]={status.isOpen}
								class:hover:bg-[var(--btn-bg-hover)]={status.isOpen}
								href={call.link}
								target="_blank"
								rel="noreferrer"
								onclick={(e) => e.stopPropagation()}
							>
								Link &rarr;
							</a>
						{/if}
					</div>
				</div>
			</button>
		{/snippet}

		<div class="grid grid-cols-1 gap-3">
			{#each activeCalls as call}
				{@render callCard(call)}
			{/each}
		</div>

		{#if archivedCalls.length > 0}
			<div class="my-8 flex items-center gap-4">
				<div class="h-px flex-1 bg-zinc-800"></div>
				<span class="text-sm font-medium tracking-wider text-zinc-500 uppercase">Archived</span>
				<div class="h-px flex-1 bg-zinc-800"></div>
			</div>

			<div class="grid grid-cols-1 gap-3">
				{#each archivedCalls as call}
					{@render callCard(call)}
				{/each}
			</div>
		{/if}
	{/if}
</section>
