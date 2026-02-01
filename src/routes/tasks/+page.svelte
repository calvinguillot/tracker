<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import type { Session } from '@supabase/supabase-js';
	import { Loader, Plus, ArrowUp, ArrowDown, ListChecks, Link as LinkIcon } from 'lucide-svelte';
	import TaskModal from '$lib/components/TaskModal.svelte';
	import { showAlert, showConfirm, alertState } from '$lib/alertStore.svelte';
	import { settings } from '$lib/settingsStore.svelte';

	type Task = {
		id: number;
		created_at: string;
		completed_at: string | null;
		deadline_at: string | null;
		status: string;
		title: string;
		type: string | null;
		body: string | null;
		checklist: any;
		color: string | null;
		links: any;
	};

	let session = $state<Session | null>(null);
	let isLoading = $state(true);
	let tasks = $state<Task[]>([]);
	let isModalOpen = $state(false);
	let currentEntry = $state<Task | null>(null);

	// Sorting state
	type SortField = 'title' | 'deadline' | 'created' | 'status' | 'completed';
	let sortField = $state<SortField>('deadline');
	let sortDirection = $state<'asc' | 'desc'>('asc');

	let filterType = $state('all');

	let filteredTasks = $derived(
		filterType === 'all' ? tasks : tasks.filter((t) => t.type === filterType)
	);

	let sortedTasks = $derived(
		[...filteredTasks].sort((a, b) => {
			const modifier = sortDirection === 'asc' ? 1 : -1;

			if (sortField === 'title') {
				return (a.title || '').localeCompare(b.title || '') * modifier;
			} else if (sortField === 'deadline') {
				const dateA = a.deadline_at
					? new Date(a.deadline_at).getTime()
					: modifier === 1
						? Infinity
						: -Infinity;
				const dateB = b.deadline_at
					? new Date(b.deadline_at).getTime()
					: modifier === 1
						? Infinity
						: -Infinity;
				return (dateA - dateB) * modifier;
			} else if (sortField === 'completed') {
				const dateA = a.completed_at ? new Date(a.completed_at).getTime() : 0; // treat null as oldest or newest?
				const dateB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
				return (dateA - dateB) * modifier;
			} else if (sortField === 'created') {
				const dateA = new Date(a.created_at).getTime();
				const dateB = new Date(b.created_at).getTime();
				return (dateA - dateB) * modifier;
			} else if (sortField === 'status') {
				// Simple string sort for status for now
				return (a.status || '').localeCompare(b.status || '') * modifier;
			}
			return 0;
		})
	);

	let activeTasks = $derived(sortedTasks.filter((t) => t.status !== 'done'));

	let archivedTasks = $derived(sortedTasks.filter((t) => t.status === 'done'));

	let completedCount = $derived(tasks.filter((t) => t.status === 'done').length);

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
		console.log('Fetching tasks...');
		const { data: d, error } = await supabase
			.from('tasks')
			.select('*')
			.order('deadline_at', { ascending: true });

		if (!error && d) {
			tasks = d;
		} else if (error) {
			console.error('Error fetching tasks:', error);
		}

		isLoading = false;
	}

	function openNew() {
		currentEntry = null;
		isModalOpen = true;
	}

	function openEdit(entry: Task) {
		currentEntry = entry;
		isModalOpen = true;
	}

	async function handleDelete(id: number) {
		const confirmed = await showConfirm(
			'Are you sure you want to delete this task?',
			'Delete Task',
			{ confirmText: 'Delete', isDestructive: true }
		);

		if (!confirmed) return;

		const { error } = await supabase.from('tasks').delete().eq('id', id);

		if (error) {
			console.error('Error deleting task:', error);
			showAlert('Error deleting: ' + error.message, 'Error');
		} else {
			showAlert('Task deleted successfully!', 'Success');
			fetchData();
		}
	}

	async function handleSave(entry: any) {
		const { id, ...payload } = entry;

		if (currentEntry) {
			// Update
			const { error } = await supabase.from('tasks').update(payload).eq('id', currentEntry.id);

			if (error) {
				console.error('Error updating task:', error);
				showAlert('Error updating: ' + error.message, 'Error');
			} else {
				showAlert('Task updated successfully!', 'Success');
				isModalOpen = false;
				fetchData();
			}
		} else {
			// Insert
			const { error } = await supabase.from('tasks').insert(payload);

			if (error) {
				console.error('Error saving task:', error);
				showAlert('Error saving: ' + error.message, 'Error');
			} else {
				showAlert('Task saved successfully!', 'Success');
				isModalOpen = false;
				fetchData();
			}
		}
	}

	const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString() : '—');
	function truncatePreview(text: string | null, max = 50) {
		if (!text) return '';
		return text.length > max ? text.slice(0, max) + '...' : text;
	}

	function getStatusColor(status: string | null) {
		switch (status) {
			case 'todo':
				return { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20' };
			case 'in_progress':
				return { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' };
			case 'done':
				return {
					bg: 'bg-emerald-500/10',
					text: 'text-emerald-400',
					border: 'border-emerald-500/20'
				};
			case 'archived':
				return { bg: 'bg-zinc-800', text: 'text-zinc-500', border: 'border-zinc-700' };
			default:
				return { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20' };
		}
	}

	function getStatusLabel(status: string | null) {
		if (!status) return 'Unknown';
		return status
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	function getChecklistCounts(checklist: any) {
		if (!checklist) return { total: 0, completed: 0 };

		// If it's the new format (array of checklists)
		if (Array.isArray(checklist) && checklist.length > 0 && 'items' in checklist[0]) {
			let total = 0;
			let completed = 0;
			checklist.forEach((list: any) => {
				if (list.items) {
					total += list.items.length;
					completed += list.items.filter((i: any) => i.completed).length;
				}
			});
			return { total, completed };
		}

		// Fallback for old/flat format
		if (Array.isArray(checklist) && checklist.length > 0) {
			return {
				total: checklist.length,
				completed: checklist.filter((i: any) => i.completed).length
			};
		}

		return { total: 0, completed: 0 };
	}
</script>

<TaskModal
	isOpen={isModalOpen}
	entry={currentEntry}
	onClose={() => (isModalOpen = false)}
	onSave={handleSave}
/>

<section class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<h2 class="hidden text-lg font-bold text-zinc-100 md:block">Tasks</h2>
		{#if session && !isModalOpen && !alertState.isOpen}
			<button
				onclick={openNew}
				class="fixed right-8 bottom-8 z-50 rounded-full p-4 text-white shadow-lg transition-all hover:scale-105 hover:brightness-110"
				style="background-color: {settings.getAccentHex()}"
				aria-label="New Task"
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
			Sign in to view tasks.
		</div>
	{:else if tasks.length === 0}
		<div class="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-400">
			No tasks yet.
		</div>
	{:else}
		<!-- Sorting Controls -->
		<div class="mb-4 flex flex-wrap items-center gap-4 text-sm">
			<div class="flex items-center gap-2">
				<span class="text-zinc-500">Filter:</span>
				<select
					bind:value={filterType}
					class="cursor-pointer rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 shadow-sm outline-none focus:border-indigo-500 focus:ring-indigo-500"
				>
					<option value="all">All Tasks</option>
					{#each settings.settings.task_types as type}
						<option value={type.id}>{type.label}</option>
					{/each}
				</select>
			</div>
			<div class="h-4 w-px bg-zinc-800"></div>

			<span class="text-zinc-500">Sort by:</span>
			{#each ['title', 'deadline', 'created', 'status', 'completed'] as field}
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
				Completed {completedCount} / {tasks.length}
			</span>
		</div>

		{#snippet taskCard(task: Task, archived: boolean)}
			{@const statusStyle = getStatusColor(task.status)}
			<li
				class={`group relative flex flex-col justify-between rounded-lg border p-4 transition-all ${
					archived
						? 'border-zinc-800/60 bg-zinc-900/30 text-zinc-500 hover:border-zinc-700/60 hover:bg-zinc-900/40'
						: 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900/80'
				}`}
			>
				<div class="flex flex-col gap-3">
					<!-- Header: Title, Status -->
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								{#if task.color}
									<div
										class={`h-3 w-3 rounded-full ${archived ? 'opacity-50' : ''} ${task.color.startsWith('bg-') ? task.color : ''}`}
										style={!task.color.startsWith('bg-') ? `background-color: ${task.color}` : ''}
										title="Task Color"
									></div>
								{/if}
								<h3
									class={`truncate text-base font-bold ${archived ? 'text-zinc-500' : 'text-zinc-100'}`}
									title={task.title}
								>
									{task.title}
								</h3>
							</div>
							<div class="mt-1 flex items-center gap-2 text-xs">
								<div
									class={`shrink-0 rounded-full px-2 py-0.5 font-medium ${statusStyle.bg} ${statusStyle.text}`}
								>
									{getStatusLabel(task.status)}
								</div>
								{#if task.type}
									<span class="text-zinc-500">•</span>
									<span class={archived ? 'text-zinc-600' : 'text-zinc-400'}
										>{settings.getTaskType(task.type)?.label ?? task.type}</span
									>
								{/if}
								{#if task.checklist}
									{@const counts = getChecklistCounts(task.checklist)}
									{#if counts.total > 0}
										<span class="text-zinc-500">•</span>
										<ListChecks class={`h-4 w-4 ${archived ? 'text-zinc-600' : 'text-zinc-400'}`} />
										<span class={`text-xs ${archived ? 'text-zinc-600' : 'text-zinc-500'}`}>
											{counts.completed}/{counts.total}
										</span>
									{/if}
								{/if}
								{#if task.links && task.links.length > 0}
									<span class="text-zinc-500">•</span>
									<LinkIcon class={`h-4 w-4 ${archived ? 'text-zinc-600' : 'text-zinc-400'}`} />
									<span class={`text-xs ${archived ? 'text-zinc-600' : 'text-zinc-500'}`}>
										{task.links.length}
									</span>
								{/if}
							</div>
						</div>
					</div>

					<!-- Body Snippet -->
					{#if task.body}
						<p class={`text-sm ${archived ? 'text-zinc-600' : 'text-zinc-400'}`}>
							{truncatePreview(task.body)}
						</p>
					{/if}

					<!-- Details Row -->
					<div
						class="mt-2 flex items-center justify-between gap-4 border-t border-zinc-800/50 pt-3"
					>
						<div class="flex gap-4">
							<div class="flex flex-col gap-0.5">
								<span class="text-[10px] font-bold tracking-wider text-zinc-500 uppercase"
									>Deadline</span
								>
								<span class={`text-xs ${archived ? 'text-zinc-500' : 'text-zinc-300'}`}>
									{formatDate(task.deadline_at)}
								</span>
							</div>
							{#if task.completed_at}
								<div class="flex flex-col gap-0.5">
									<span class="text-[10px] font-bold tracking-wider text-zinc-500 uppercase"
										>Completed</span
									>
									<span class={`text-xs ${archived ? 'text-zinc-500' : 'text-emerald-400'}`}>
										{formatDate(task.completed_at)}
									</span>
								</div>
							{/if}
						</div>

						<div class="flex items-center gap-2">
							<button
								onclick={() => openEdit(task)}
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
								onclick={() => handleDelete(task.id)}
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

		<ul class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each activeTasks as task}
				{@render taskCard(task, false)}
			{/each}
		</ul>

		{#if archivedTasks.length > 0}
			<div class="my-8 flex items-center gap-4">
				<div class="h-px flex-1 bg-zinc-800"></div>
				<span class="text-sm font-medium tracking-wider text-zinc-500 uppercase">Archived</span>
				<div class="h-px flex-1 bg-zinc-800"></div>
			</div>

			<ul class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each archivedTasks as task}
					{@render taskCard(task, true)}
				{/each}
			</ul>
		{/if}
	{/if}
</section>
