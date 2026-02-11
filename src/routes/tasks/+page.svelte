<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import type { Session } from '@supabase/supabase-js';
	import {
		LoaderCircle,
		Plus,
		ArrowUp,
		ArrowDown,
		ListChecks,
		Link as LinkIcon,
		List,
		Calendar,
		Circle,
		CircleDot,
		CheckCircle2,
		ChevronLeft,
		ChevronRight
	} from 'lucide-svelte';
	import { flip } from 'svelte/animate';
	import { fade, fly } from 'svelte/transition';
	import TaskModal from '$lib/components/TaskModal.svelte';
	import { showAlert, showConfirm, alertState } from '$lib/alertStore.svelte';
	import { settings } from '$lib/settingsStore.svelte';
	import { dataStore } from '$lib/dataStore.svelte';

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
	let tasks = $derived(dataStore.tasks);
	let isModalOpen = $state(false);
	let currentEntry = $state<Task | null>(null);
	let viewMode = $state<'list' | 'week'>('list');
	const maxCharDescriptionLength = 40;

	// Sorting state
	type SortField = 'title' | 'deadline' | 'created' | 'status' | 'completed';
	let sortField = $state<SortField>('deadline');
	let sortDirection = $state<'asc' | 'desc'>('asc');

	let filterType = $state('all');

	let weekOffset = $state(0); // 0 = current week, -1 = last week, 1 = next week

	let draggingTaskId = $state<number | null>(null);
	let dragOverDate = $state<Date | null>(null);

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

	let currentWeek = $derived.by(() => {
		const now = new Date();
		const day = now.getDay(); // 0=Sun, 1=Mon
		const diff = now.getDate() - day + (day === 0 ? -6 : 1);
		const monday = new Date(now);
		monday.setDate(diff + weekOffset * 7); // Apply offset
		monday.setHours(0, 0, 0, 0);

		const week = [];
		for (let i = 0; i < 7; i++) {
			const d = new Date(monday);
			d.setDate(monday.getDate() + i);
			week.push(d);
		}
		return week;
	});

	let weekNumber = $derived.by(() => {
		const firstDay = currentWeek[0];
		const startOfYear = new Date(firstDay.getFullYear(), 0, 1);
		const days = Math.floor((firstDay.getTime() - startOfYear.getTime()) / 86400000);
		return Math.ceil((days + startOfYear.getDay() + 1) / 7);
	});

	let weekDateRange = $derived.by(() => {
		const start = currentWeek[0];
		const end = currentWeek[6];
		const formatOpts: Intl.DateTimeFormatOptions = {
			month: 'short' as const,
			day: 'numeric' as const
		};
		return `${start.toLocaleDateString('en-US', formatOpts)} - ${end.toLocaleDateString('en-US', formatOpts)}`;
	});

	function previousWeek() {
		weekOffset--;
	}

	function nextWeek() {
		weekOffset++;
	}

	function goToCurrentWeek() {
		weekOffset = 0;
	}

	function getTasksForDay(date: Date) {
		return activeTasks.filter((t) => {
			if (!t.deadline_at) return false;
			const d = new Date(t.deadline_at);
			return (
				d.getFullYear() === date.getFullYear() &&
				d.getMonth() === date.getMonth() &&
				d.getDate() === date.getDate()
			);
		});
	}

	function handleDragStart(event: DragEvent, task: Task) {
		draggingTaskId = task.id;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', task.id.toString());
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
	}

	function handleDragEnter(event: DragEvent, date: Date) {
		event.preventDefault();
		dragOverDate = date;
	}

	function handleDragLeave(event: DragEvent) {
		// Only clear if we're leaving the day column, not entering a child element
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const x = event.clientX;
		const y = event.clientY;
		if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
			dragOverDate = null;
		}
	}

	async function handleDrop(event: DragEvent, targetDate: Date) {
		event.preventDefault();
		dragOverDate = null;

		if (draggingTaskId === null) return;

		const task = tasks.find((t) => t.id === draggingTaskId);
		if (!task) {
			draggingTaskId = null;
			return;
		}

		// Calculate new deadline_at
		let newDeadline: Date;
		if (task.deadline_at) {
			// Preserve the original time, just update the date
			const originalDeadline = new Date(task.deadline_at);
			newDeadline = new Date(targetDate);
			newDeadline.setHours(
				originalDeadline.getHours(),
				originalDeadline.getMinutes(),
				originalDeadline.getSeconds(),
				originalDeadline.getMilliseconds()
			);
		} else {
			// No existing deadline, use the target date (which is 00:00:00)
			newDeadline = new Date(targetDate);
		}

		const newDeadlineIso = newDeadline.toISOString();

		// Optimistic update
		dataStore.updateTask({ ...task, deadline_at: newDeadlineIso });

		// Persist to database
		const { error } = await supabase
			.from('tasks')
			.update({ deadline_at: newDeadlineIso })
			.eq('id', draggingTaskId);

		if (error) {
			console.error('Error updating task deadline:', error);
			showAlert('Error updating deadline: ' + error.message, 'Error');
			// Revert on error
			dataStore.updateTask(task); // Revert to old task state (which has old deadline)
		}

		draggingTaskId = null;
	}

	onMount(() => {
		supabase.auth.getSession().then(({ data: { session: s } }) => {
			session = s;
		});

		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_event, _session) => {
			session = _session;
		});

		return () => subscription.unsubscribe();
	});

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
			dataStore.deleteTask(id);
		}
	}

	async function handleDeleteFromModal(id: number) {
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
			isModalOpen = false;
			dataStore.deleteTask(id);
		}
	}

	async function handleSave(entry: any) {
		const { id, ...payload } = entry;

		if (currentEntry) {
			// Update
			const { data, error } = await supabase
				.from('tasks')
				.update(payload)
				.eq('id', currentEntry.id)
				.select()
				.single();

			if (error) {
				console.error('Error updating task:', error);
				showAlert('Error updating: ' + error.message, 'Error');
			} else {
				showAlert('Task updated successfully!', 'Success');
				isModalOpen = false;
				if (data) dataStore.updateTask(data);
			}
		} else {
			// Insert
			const { data, error } = await supabase.from('tasks').insert(payload).select().single();

			if (error) {
				console.error('Error saving task:', error);
				showAlert('Error saving: ' + error.message, 'Error');
			} else {
				showAlert('Task saved successfully!', 'Success');
				isModalOpen = false;
				if (data) dataStore.addTask(data);
			}
		}
	}

	async function quickStatusUpdate(task: Task, newStatus: string) {
		const payload: any = { status: newStatus };
		if (newStatus === 'done') {
			payload.completed_at = new Date().toISOString();
		} else {
			payload.completed_at = null;
		}

		// Optimistic update - modify local state immediately
		dataStore.updateTask({ ...task, status: newStatus, completed_at: payload.completed_at });

		const { error } = await supabase.from('tasks').update(payload).eq('id', task.id);

		if (error) {
			console.error('Error updating task status:', error);
			showAlert('Error updating status: ' + error.message, 'Error');
			// Revert on error
			dataStore.updateTask(task);
		}
	}

	const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString() : '—');
	function truncatePreview(text: string | null, max = maxCharDescriptionLength) {
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
	onDelete={handleDeleteFromModal}
/>

{#snippet weekNavigation()}
	<div class="flex items-center gap-2">
		<button
			onclick={previousWeek}
			aria-label="Previous week"
			class="flex items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 p-1.5 text-zinc-400 shadow-sm transition-colors hover:bg-zinc-700 hover:text-zinc-100"
		>
			<ChevronLeft class="h-4 w-4" />
		</button>
		<div class="text-center">
			<span class="text-sm font-medium text-zinc-300">Week {weekNumber}</span>
			<span class="ml-1 text-xs text-zinc-500">{weekDateRange}</span>
		</div>
		<button
			onclick={nextWeek}
			aria-label="Next week"
			class="flex items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 p-1.5 text-zinc-400 shadow-sm transition-colors hover:bg-zinc-700 hover:text-zinc-100"
		>
			<ChevronRight class="h-4 w-4" />
		</button>
	</div>
{/snippet}

<section>
	<div class="flex flex-wrap items-center justify-between gap-4">
		{#if session && !isModalOpen && !alertState.isOpen}
			<button
				onclick={openNew}
				class="fixed right-8 bottom-24 z-50 rounded-full p-4 shadow-lg/30 drop-shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:brightness-110 md:right-16 md:bottom-16"
				style="--accent-color: {settings.getAccentLightHex()}; background-color: {settings.getAccentHex()}/50"
				aria-label="New Task"
			>
				<Plus class="h-6 w-6 text-(--accent-color)" />
			</button>
		{/if}
	</div>

	{#if !session}
		<div class="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-400">
			Sign in to view tasks.
		</div>
	{:else if tasks.length === 0}
		<div class="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-400">
			No tasks yet.
		</div>
	{:else}
		<!-- Sorting Controls -->
		<div class="mb-4 flex flex-col gap-3 text-sm md:flex-row md:items-center">
			<!-- Left: Sorting and Filter -->
			<div class="flex flex-wrap items-center justify-between gap-2 md:gap-2">
				<div class="flex flex-wrap items-center gap-2">
					<!-- <span class="text-zinc-500">Sort by:</span> -->
					<select
						bind:value={sortField}
						class="cursor-pointer rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 shadow-sm outline-none focus:border-indigo-500 focus:ring-indigo-500"
					>
						{#each ['title', 'deadline', 'created', 'status', 'completed'] as field}
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
				<div class="flex items-center gap-2">
					<!-- <span class="text-zinc-500">Filter:</span> -->
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
			</div>

			<!-- Center: Week Navigation (desktop only, when in week view) -->
			{#if viewMode === 'week'}
				<div class="hidden flex-1 md:flex md:justify-center">
					{@render weekNavigation()}
				</div>
			{/if}

			<!-- Right: Completed count and View toggle (desktop) -->
			<div class="hidden md:ml-auto md:flex md:items-center md:gap-4">
				<span class="text-xs text-zinc-500">
					Completed {completedCount} / {tasks.length}
				</span>

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
						class={`rounded-md p-1.5 transition-all ${viewMode === 'week' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-300'}`}
						onclick={() => (viewMode = 'week')}
						aria-label="Week View"
					>
						<Calendar class="h-4 w-4" />
					</button>
				</div>
			</div>
		</div>

		<!-- Row 2: Completed count and View toggle (mobile only) -->
		<div class="mb-4 flex items-center justify-between md:hidden">
			<span class="text-xs text-zinc-500">Completed {completedCount} / {tasks.length}</span>
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
					class={`rounded-md p-1.5 transition-all ${viewMode === 'week' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-300'}`}
					onclick={() => (viewMode = 'week')}
					aria-label="Week View"
				>
					<Calendar class="h-4 w-4" />
				</button>
			</div>
		</div>

		<!-- Row 3: Week controls (mobile only, only in week view) -->
		{#if viewMode === 'week'}
			<div class="mb-4 flex items-center justify-center md:hidden">
				{@render weekNavigation()}
			</div>
		{/if}

		{#if viewMode === 'list'}
			{#snippet taskCard(task: Task, archived: boolean)}
				<div
					class={`group relative flex w-full cursor-pointer flex-col justify-between rounded-lg border p-4 text-left transition-all ${
						archived
							? 'border-zinc-800/60 bg-zinc-900/30 text-zinc-500 hover:border-zinc-700/60 hover:bg-zinc-900/40'
							: 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900/80'
					}`}
					onclick={() => openEdit(task)}
					role="button"
					tabindex={0}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							openEdit(task);
						}
					}}
				>
					<div class="flex flex-col gap-3">
						<!-- Header: Title, Status Toggle -->
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
									{#if task.type}
										<span class={archived ? 'text-zinc-600' : 'text-zinc-400'}
											>{settings.getTaskType(task.type)?.label ?? task.type}</span
										>
									{/if}
									{#if task.checklist}
										{@const counts = getChecklistCounts(task.checklist)}
										{#if counts.total > 0}
											{#if task.type}
												<span class="text-zinc-500">•</span>
											{/if}
											<ListChecks
												class={`h-4 w-4 ${archived ? 'text-zinc-600' : 'text-zinc-400'}`}
											/>
											<span class={`text-xs ${archived ? 'text-zinc-600' : 'text-zinc-500'}`}>
												{counts.completed}/{counts.total}
											</span>
										{/if}
									{/if}
									{#if task.links && task.links.length > 0}
										{#if task.type || (task.checklist && getChecklistCounts(task.checklist).total > 0)}
											<span class="text-zinc-500">•</span>
										{/if}
										<LinkIcon class={`h-4 w-4 ${archived ? 'text-zinc-600' : 'text-zinc-400'}`} />
										<span class={`text-xs ${archived ? 'text-zinc-600' : 'text-zinc-500'}`}>
											{task.links.length}
										</span>
									{/if}
								</div>
							</div>
							<!-- Triple Toggle: Todo | In Progress | Done -->
							<div class="flex items-center gap-0.5 rounded-lg bg-zinc-800/60 p-0.5">
								<button
									type="button"
									class={`flex items-center justify-center rounded px-1.5 py-1 transition-all ${
										task.status === 'todo'
											? 'bg-zinc-700 text-zinc-100 shadow-sm'
											: archived
												? 'text-zinc-600 hover:text-zinc-500'
												: 'text-zinc-400 hover:text-zinc-300'
									}`}
									onclick={(e) => {
										e.stopPropagation();
										quickStatusUpdate(task, 'todo');
									}}
									title="To Do"
									aria-label="Set status to To Do"
								>
									<Circle class="h-3.5 w-3.5" />
								</button>
								<button
									type="button"
									class={`flex items-center justify-center rounded px-1.5 py-1 shadow-sm transition-all ${
										task.status === 'in_progress'
											? ''
											: archived
												? 'text-zinc-600 hover:text-zinc-500'
												: 'text-zinc-400 hover:text-zinc-300'
									}`}
									style={task.status === 'in_progress'
										? (() => {
												const hex = settings.getAccentHex();
												const r = parseInt(hex.slice(1, 3), 16);
												const g = parseInt(hex.slice(3, 5), 16);
												const b = parseInt(hex.slice(5, 7), 16);
												return `background-color: rgba(${r}, ${g}, ${b}, 0.2); color: ${settings.getAccentLightHex()}`;
											})()
										: ''}
									onclick={(e) => {
										e.stopPropagation();
										quickStatusUpdate(task, 'in_progress');
									}}
									title="In Progress"
									aria-label="Set status to In Progress"
								>
									<CircleDot class="h-3.5 w-3.5" />
								</button>
								<button
									type="button"
									class={`flex items-center justify-center rounded px-1.5 py-1 transition-all ${
										task.status === 'done'
											? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
											: archived
												? 'text-zinc-600 hover:text-zinc-500'
												: 'text-zinc-400 hover:text-zinc-300'
									}`}
									onclick={(e) => {
										e.stopPropagation();
										quickStatusUpdate(task, 'done');
									}}
									title="Done"
									aria-label="Set status to Done"
								>
									<CheckCircle2 class="h-3.5 w-3.5" />
								</button>
							</div>
						</div>

						<!-- Body Snippet -->
						{#if task.body}
							<p class={`text-sm ${archived ? 'text-zinc-600' : 'text-zinc-400'}`}>
								{truncatePreview(task.body)}
							</p>
						{/if}

						<!-- Details Row -->
						<div class="mt-2 flex items-center gap-4 border-t border-zinc-800/50 pt-3">
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
						</div>
					</div>
				</div>
			{/snippet}

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each activeTasks as task (task.id)}
					<div animate:flip={{ duration: 300 }} transition:fade={{ duration: 200 }}>
						{@render taskCard(task, false)}
					</div>
				{/each}
			</div>

			{#if archivedTasks.length > 0}
				<div class="my-8 flex items-center gap-4">
					<div class="h-px flex-1 bg-zinc-800"></div>
					<span class="text-sm font-medium tracking-wider text-zinc-500 uppercase">Archived</span>
					<div class="h-px flex-1 bg-zinc-800"></div>
				</div>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					{#each archivedTasks as task (task.id)}
						<div animate:flip={{ duration: 300 }} transition:fade={{ duration: 200 }}>
							{@render taskCard(task, true)}
						</div>
					{/each}
				</div>
			{/if}
		{:else}
			<div class="flex flex-col gap-4 md:grid md:grid-cols-7">
				{#each currentWeek as day}
					{@const dayTasks = getTasksForDay(day)}
					{@const isToday = new Date().toDateString() === day.toDateString()}
					{@const isDragOver = dragOverDate && dragOverDate.toDateString() === day.toDateString()}
					<div
						class={`flex min-h-[200px] flex-col gap-2 rounded-lg border p-2 transition-colors ${
							isToday
								? 'border-zinc-700 bg-zinc-900/40'
								: isDragOver
									? 'border-indigo-500/50 bg-zinc-800/50'
									: 'border-transparent'
						}`}
						ondragover={handleDragOver}
						ondragenter={(e) => handleDragEnter(e, day)}
						ondragleave={handleDragLeave}
						ondrop={(e) => handleDrop(e, day)}
					>
						<!-- Header -->
						<div class="flex items-center justify-between border-b border-zinc-800 pb-2">
							<span class={`text-sm font-medium ${isToday ? 'text-indigo-400' : 'text-zinc-400'}`}>
								{day.toLocaleDateString('en-US', { weekday: 'short' })}
							</span>
							<span class={`text-xs ${isToday ? 'text-indigo-400' : 'text-zinc-600'}`}>
								{day.getDate()}
							</span>
						</div>

						<!-- Tasks -->
						<div class="flex flex-1 flex-col gap-2">
							{#each dayTasks as task}
								{@const isDragging = draggingTaskId === task.id}
								<button
									draggable={true}
									ondragstart={(e) => handleDragStart(e, task)}
									class={`group flex flex-col gap-1 rounded border border-zinc-800 bg-zinc-900/60 p-2 text-left transition-all ${
										isDragging ? 'cursor-grabbing opacity-50' : 'cursor-grab hover:bg-zinc-800/80'
									}`}
									onclick={() => {
										if (!isDragging) {
											openEdit(task);
										}
									}}
								>
									<div class="flex items-center gap-2">
										{#if task.color}
											<div
												class={`h-2 w-2 shrink-0 rounded-full ${task.color.startsWith('bg-') ? task.color : ''}`}
												style={!task.color.startsWith('bg-')
													? `background-color: ${task.color}`
													: ''}
											></div>
										{/if}
										<span class="truncate text-xs font-medium text-zinc-300" title={task.title}>
											{task.title}
										</span>
									</div>
									<div class="flex items-center gap-2">
										{#if task.type}
											<span class="text-[10px] text-zinc-500 uppercase">
												{settings.getTaskType(task.type)?.label ?? task.type}
											</span>
										{/if}
									</div>
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</section>
