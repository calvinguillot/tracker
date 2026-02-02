<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import type { Session } from '@supabase/supabase-js';
	import { Loader, Plus, ArrowUp, ArrowDown } from 'lucide-svelte';
	import NoteModal from '$lib/components/NoteModal.svelte';
	import { showAlert, showConfirm, alertState } from '$lib/alertStore.svelte';
	import { settings } from '$lib/settingsStore.svelte';

	type Note = {
		id: number;
		created_at: string;
		title: string;
		body: string;
		color: string;
	};

	let session = $state<Session | null>(null);
	let isLoading = $state(true);
	let notes = $state<Note[]>([]);
	let isModalOpen = $state(false);
	let currentEntry = $state<Note | null>(null);

	// Sorting state
	type SortField = 'title' | 'created';
	let sortField = $state<SortField>('created');
	let sortDirection = $state<'asc' | 'desc'>('desc');

	let sortedNotes = $derived(
		[...notes].sort((a, b) => {
			const modifier = sortDirection === 'asc' ? 1 : -1;

			if (sortField === 'title') {
				return (a.title || '').localeCompare(b.title || '') * modifier;
			} else if (sortField === 'created') {
				const dateA = new Date(a.created_at).getTime();
				const dateB = new Date(b.created_at).getTime();
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
			sortDirection = 'desc'; // Default to desc for created (newest first)
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
		console.log('Fetching notes...');
		const { data: d, error } = await supabase
			.from('notes')
			.select('id, created_at, title, body, color')
			.order('created_at', { ascending: false });

		if (!error && d) {
			notes = d;
		} else if (error) {
			console.error('Error fetching notes:', error);
		}

		isLoading = false;
	}

	function openNew() {
		currentEntry = null;
		isModalOpen = true;
	}

	function openEdit(entry: Note) {
		currentEntry = entry;
		isModalOpen = true;
	}

	async function handleDelete(id: number) {
		const confirmed = await showConfirm(
			'Are you sure you want to delete this note?',
			'Delete Note',
			{ confirmText: 'Delete', isDestructive: true }
		);

		if (!confirmed) return;

		const { error } = await supabase.from('notes').delete().eq('id', id);

		if (error) {
			console.error('Error deleting note:', error);
			showAlert('Error deleting: ' + error.message, 'Error');
		} else {
			showAlert('Note deleted successfully!', 'Success');
			fetchData();
		}
	}

	async function handleSave(entry: any) {
		const { id, ...payload } = entry;

		if (currentEntry) {
			// Update
			const { error } = await supabase.from('notes').update(payload).eq('id', currentEntry.id);

			if (error) {
				console.error('Error updating note:', error);
				showAlert('Error updating: ' + error.message, 'Error');
			} else {
				showAlert('Note updated successfully!', 'Success');
				isModalOpen = false;
				fetchData();
			}
		} else {
			// Insert
			const { error } = await supabase.from('notes').insert(payload);

			if (error) {
				console.error('Error saving note:', error);
				showAlert('Error saving: ' + error.message, 'Error');
			} else {
				showAlert('Note saved successfully!', 'Success');
				isModalOpen = false;
				fetchData();
			}
		}
	}

	function formatBody(text: string) {
		if (!text) return '';
		// Convert newlines to <br> for display
		return text.replace(/\n/g, '<br>');
	}
	function truncatePreview(text: string | null, max = 50) {
		if (!text) return '';
		return text.length > max ? text.slice(0, max) + '...' : text;
	}
</script>

<NoteModal
	isOpen={isModalOpen}
	entry={currentEntry}
	onClose={() => (isModalOpen = false)}
	onSave={handleSave}
/>

<section class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<h2 class="hidden text-lg font-bold text-zinc-100 md:block">Notes</h2>
		{#if session && !isModalOpen && !alertState.isOpen}
			<button
				onclick={openNew}
				class="fixed right-8 bottom-8 z-50 rounded-full p-4 shadow-lg/30 drop-shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:brightness-110 md:right-16 md:bottom-16"
				style="--accent-color: {settings.getAccentLightHex()}; background-color: {settings.getAccentHex()}/50"
				aria-label="New Note"
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
			Sign in to view notes.
		</div>
	{:else if notes.length === 0}
		<div class="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-400">
			No notes yet.
		</div>
	{:else}
		<!-- Sorting Controls -->
		<div class="mb-4 flex flex-wrap items-center gap-4 text-sm">
			<span class="text-zinc-500">Sort by:</span>
			{#each ['created', 'title'] as field}
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
				Amount of notes: {notes.length}
			</span>
		</div>

		<ul class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each sortedNotes as note}
				<li
					class="group relative flex flex-col gap-4 rounded-lg border border-zinc-800 p-4 transition-all hover:border-zinc-700 hover:shadow-lg"
					style="background-color: {note.color || '#18181b'}"
				>
					<div class="flex flex-col gap-3">
						<h3 class="wrap-break-words text-lg font-bold text-zinc-100">
							{note.title}
						</h3>

						{#if note.body}
							<div class="prose prose-sm max-w-none wrap-break-word text-zinc-300 prose-invert">
								{@html formatBody(truncatePreview(note.body))}
							</div>
						{/if}
					</div>

					<div
						class="mt-auto flex items-center justify-between gap-4 border-t border-zinc-800/50 pt-3"
					>
						<div class="text-xs text-zinc-400/70">
							{new Date(note.created_at).toLocaleDateString()}
						</div>

						<div class="flex items-center gap-2">
							<button
								onclick={() => openEdit(note)}
								class="rounded-md p-2 text-indigo-400 transition-colors hover:bg-black/20 hover:text-indigo-300"
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
								onclick={() => handleDelete(note.id)}
								class="rounded-md p-2 text-red-400 transition-colors hover:bg-black/20 hover:text-red-300"
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
				</li>
			{/each}
		</ul>
	{/if}
</section>
