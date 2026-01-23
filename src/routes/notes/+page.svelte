<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import type { Session } from '@supabase/supabase-js';
	import { Loader, Plus, ArrowUp, ArrowDown, Trash2, Edit2 } from 'lucide-svelte';
	import NoteModal from '$lib/components/NoteModal.svelte';
	import { showAlert, showConfirm, alertState } from '$lib/alertStore.svelte';

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
</script>

<NoteModal
	isOpen={isModalOpen}
	entry={currentEntry}
	onClose={() => (isModalOpen = false)}
	onSave={handleSave}
/>

<section class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<h2 class="text-lg font-bold text-zinc-100">Notes</h2>
		{#if session && !isModalOpen && !alertState.isOpen}
			<button
				onclick={openNew}
				class="fixed right-8 bottom-8 z-50 rounded-full bg-indigo-600 p-4 text-white shadow-lg transition-transform hover:scale-105 hover:bg-indigo-500"
				aria-label="New Note"
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
				Total: {notes.length}
			</span>
		</div>

		<ul class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each sortedNotes as note}
				<li
					class="group relative flex flex-col justify-between overflow-hidden rounded-lg border border-zinc-800/50 transition-all hover:border-zinc-700 hover:shadow-lg"
					style="background-color: {note.color || '#18181b'}"
				>
					<div class="flex flex-col gap-3 p-4">
						<div class="flex items-start justify-between gap-3">
							<h3 class="text-lg font-bold text-zinc-100 break-words">
								{note.title}
							</h3>
						</div>
						
						<div class="prose prose-invert prose-sm max-w-none text-zinc-300 break-words">
							{@html formatBody(note.body)}
						</div>
					</div>

					<!-- Actions Overlay (visible on hover or always on touch devices if we want, but hover for now) -->
					<div class="absolute top-2 right-2 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
						<button
							onclick={() => openEdit(note)}
							class="rounded-full bg-black/50 p-2 text-indigo-400 hover:bg-black/70 hover:text-indigo-300 backdrop-blur-sm"
							aria-label="Edit"
						>
							<Edit2 class="h-4 w-4" />
						</button>
						<button
							onclick={() => handleDelete(note.id)}
							class="rounded-full bg-black/50 p-2 text-red-400 hover:bg-black/70 hover:text-red-300 backdrop-blur-sm"
							aria-label="Delete"
						>
							<Trash2 class="h-4 w-4" />
						</button>
					</div>
					
					<div class="p-4 pt-0 text-xs text-zinc-400/70 mt-auto">
						{new Date(note.created_at).toLocaleDateString()}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>
