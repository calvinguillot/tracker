<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import type { Session } from '@supabase/supabase-js';
	import {
		Loader,
		Plus,
		ArrowUp,
		ArrowDown,
		List,
		Calendar,
		ListChecks,
		Link as LinkIcon
	} from 'lucide-svelte';
	import { settings } from '$lib/settingsStore.svelte';
	import ProjectModal from '$lib/components/ProjectModal.svelte';
	import { showAlert, showConfirm, alertState } from '$lib/alertStore.svelte';

	type Project = {
		id: number;
		created_at: string;
		name: string;
		description: string | null;
		funds: number | null;
		status: number;
		percentage: number;
		start_at: string | null;
		end_at: string | null;
		colour: string | null;
		type: number | null;
		checklist: any;
		links: any;
	};

	const statusLabels: Record<number, string> = {
		0: 'Not Started',
		1: 'In Progress',
		2: 'Postponed',
		3: 'Completed',
		4: 'Cancelled'
	};

	let session = $state<Session | null>(null);
	let isLoading = $state(true);
	let projects = $state<Project[]>([]);
	let isModalOpen = $state(false);
	let currentEntry = $state<Project | null>(null);
	let viewMode = $state<'list' | 'gantt'>('list');

	// Sorting state
	type SortField = 'name' | 'date' | 'progress';
	let sortField = $state<SortField>('date');
	let sortDirection = $state<'asc' | 'desc'>('desc');

	let sortedProjects = $derived(
		[...projects].sort((a, b) => {
			const modifier = sortDirection === 'asc' ? 1 : -1;

			if (sortField === 'name') {
				return a.name.localeCompare(b.name) * modifier;
			} else if (sortField === 'date') {
				const dateA = new Date(a.created_at).getTime();
				const dateB = new Date(b.created_at).getTime();
				return (dateA - dateB) * modifier;
			} else if (sortField === 'progress') {
				return ((a.percentage || 0) - (b.percentage || 0)) * modifier;
			}
			return 0;
		})
	);

	let activeProjects = $derived(sortedProjects.filter((p) => p.status !== 3 && p.status !== 4));

	let archivedProjects = $derived(sortedProjects.filter((p) => p.status === 3 || p.status === 4));

	let completedCount = $derived(projects.filter((p) => p.status === 3).length);

	let ganttData = $derived.by(() => {
		const validProjects = sortedProjects.filter((p) => p.start_at && p.end_at);
		if (validProjects.length === 0) {
			const now = new Date();
			return {
				start: new Date(now.getFullYear(), 0, 1),
				end: new Date(now.getFullYear(), 11, 31),
				projects: [] as Project[],
				months: [] as Date[]
			};
		}

		const dates = validProjects.flatMap((p) => [new Date(p.start_at!), new Date(p.end_at!)]);
		const min = new Date(Math.min(...dates.map((d) => d.getTime())));
		const max = new Date(Math.max(...dates.map((d) => d.getTime())));

		// Add padding (1 week)
		const start = new Date(min);
		start.setDate(start.getDate() - 7);
		const end = new Date(max);
		end.setDate(end.getDate() + 7);

		// Generate months for axis
		const months: Date[] = [];
		const current = new Date(start);
		current.setDate(1);
		while (current <= end) {
			months.push(new Date(current));
			current.setMonth(current.getMonth() + 1);
		}
		if (months.length === 0) {
			months.push(new Date(start.getFullYear(), start.getMonth(), 1));
		}

		return { start, end, projects: validProjects, months };
	});

	function getGanttStyle(project: Project, start: Date, end: Date) {
		if (!project.start_at || !project.end_at) return '';
		const totalDuration = end.getTime() - start.getTime();
		const projectStart = new Date(project.start_at).getTime();
		const projectEnd = new Date(project.end_at).getTime();

		const left = ((projectStart - start.getTime()) / totalDuration) * 100;
		const width = ((projectEnd - projectStart) / totalDuration) * 100;

		return `left: ${Math.max(0, left)}%; width: ${Math.min(100, width)}%;`;
	}

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
		const { data: d, error } = await supabase
			.from('projects')
			.select('*')
			.order('created_at', { ascending: false });

		if (!error && d) {
			projects = d;
		} else if (error) {
			console.error('Error fetching projects:', error);
		}

		isLoading = false;
	}

	function openNew() {
		currentEntry = null;
		isModalOpen = true;
	}

	function openEdit(entry: Project) {
		currentEntry = entry;
		isModalOpen = true;
	}

	async function handleDelete(id: number) {
		const confirmed = await showConfirm(
			'Are you sure you want to delete this project?',
			'Delete Project',
			{ confirmText: 'Delete', isDestructive: true }
		);

		if (!confirmed) return;

		const { error } = await supabase.from('projects').delete().eq('id', id);

		if (error) {
			console.error('Error deleting project:', error);
			showAlert('Error deleting: ' + error.message, 'Error');
		} else {
			showAlert('Project deleted successfully!', 'Success');
			fetchData();
		}
	}

	async function handleSave(entry: any) {
		const { id, ...payload } = entry;

		if (currentEntry) {
			// Update
			const { error } = await supabase.from('projects').update(payload).eq('id', currentEntry.id);

			if (error) {
				console.error('Error updating project:', error);
				showAlert('Error updating: ' + error.message, 'Error');
			} else {
				showAlert('Project updated successfully!', 'Success');
				isModalOpen = false;
				fetchData();
			}
		} else {
			// Insert
			const { error } = await supabase.from('projects').insert(payload);

			if (error) {
				console.error('Error saving project:', error);
				showAlert('Error saving: ' + error.message, 'Error');
			} else {
				showAlert('Project saved successfully!', 'Success');
				isModalOpen = false;
				fetchData();
			}
		}
	}

	const formatFunds = (value: number | null) => (value === null ? '—' : `€${value}`);
	const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString() : '—');
	const getStatusLabel = (status: number) => statusLabels[status] ?? 'Unknown';
	const getStatusClasses = (status: number) => {
		switch (status) {
			case 1:
				return 'bg-amber-500/10 text-amber-400';
			case 2:
				return 'bg-purple-500/10 text-purple-400';
			case 3:
				return 'bg-emerald-500/10 text-emerald-400';
			case 4:
				return 'bg-red-500/10 text-red-400';
			case 0:
			default:
				return 'bg-zinc-800 text-zinc-400';
		}
	};

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

		// Fallback for old/flat format if any (though projects didn't use it before)
		if (Array.isArray(checklist) && checklist.length > 0) {
			// flat list presumably
			return {
				total: checklist.length,
				completed: checklist.filter((i: any) => i.completed).length
			};
		}

		return { total: 0, completed: 0 };
	}
</script>

<ProjectModal
	isOpen={isModalOpen}
	entry={currentEntry}
	onClose={() => (isModalOpen = false)}
	onSave={handleSave}
/>

<section class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<h2 class="text-lg font-bold text-zinc-100">Projects</h2>
		{#if session && !isModalOpen && !alertState.isOpen}
			<button
				onclick={openNew}
				class="fixed right-8 bottom-8 z-50 rounded-full p-4 text-white shadow-lg transition-all hover:scale-105 hover:brightness-110"
				style="background-color: {settings.getAccentHex()}"
				aria-label="New Project"
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
			Sign in to view projects.
		</div>
	{:else if projects.length === 0}
		<div class="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-400">
			No projects yet.
		</div>
	{:else}
		<!-- Sorting Controls -->
		<div class="mb-4 flex flex-wrap items-center justify-between gap-4 text-sm">
			<div class="flex flex-wrap items-center gap-4">
				<span class="text-zinc-500">Sort by:</span>
				{#each ['name', 'date', 'progress'] as field}
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

			<div class="flex items-center gap-4">
				<span class="text-xs text-zinc-500">
					Completed {completedCount} / {projects.length}
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
						class={`rounded-md p-1.5 transition-all ${viewMode === 'gantt' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-300'}`}
						onclick={() => (viewMode = 'gantt')}
						aria-label="Gantt View"
					>
						<Calendar class="h-4 w-4" />
					</button>
				</div>
			</div>
		</div>

		{#if viewMode === 'list'}
			{#snippet projectCard(project: Project, archived: boolean)}
				<li
					class={`group relative flex flex-col gap-4 rounded-lg border p-4 transition-all ${
						archived
							? 'border-zinc-800/60 bg-zinc-900/30 text-zinc-500 hover:border-zinc-700/60 hover:bg-zinc-900/40'
							: 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900/80'
					}`}
				>
					<!-- Row 1: Info & Progress -->
					<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
						<!-- Content Left -->
						<div class="flex min-w-0 flex-1 flex-col gap-2">
							<h3
								class={`truncate text-base font-bold ${archived ? 'text-zinc-500' : 'text-zinc-100'}`}
								title={project.name}
							>
								{project.name}
							</h3>
							{#if project.description}
								<p class={`text-sm ${archived ? 'text-zinc-600' : 'text-zinc-400'}`}>
									{project.description}
								</p>
							{/if}
							{#if project.type}
								{@const t = settings.getProjectType(project.type)}
								{#if t}
									<div class="flex items-center gap-2 text-xs text-zinc-500">
										<span class={`font-medium ${archived ? 'text-zinc-600' : 'text-zinc-400'}`}
											>{t.label}</span
										>
									</div>
								{/if}
							{:else if project.checklist || (project.links && project.links.length > 0)}
								<div class="flex items-center gap-3 text-xs text-zinc-500">
									{#if project.checklist}
										{@const counts = getChecklistCounts(project.checklist)}
										{#if counts.total > 0}
											<div class="flex items-center gap-1">
												<ListChecks
													class={`h-3.5 w-3.5 ${archived ? 'text-zinc-600' : 'text-zinc-400'}`}
												/>
												<span class={archived ? 'text-zinc-600' : 'text-zinc-500'}>
													{counts.completed}/{counts.total}
												</span>
											</div>
										{/if}
									{/if}
									{#if project.links && project.links.length > 0}
										<div class="flex items-center gap-1">
											<LinkIcon
												class={`h-3.5 w-3.5 ${archived ? 'text-zinc-600' : 'text-zinc-400'}`}
											/>
											<span class={archived ? 'text-zinc-600' : 'text-zinc-500'}>
												{project.links.length}
											</span>
										</div>
									{/if}
								</div>
							{/if}
						</div>

						<!-- Content Right (Progress) -->
						<div class="flex w-full shrink-0 flex-col gap-2 md:w-56">
							<div class="flex justify-end">
								<span class={`rounded-full px-2 py-0.5 text-xs ${getStatusClasses(project.status)}`}
									>{getStatusLabel(project.status)}</span
								>
							</div>
							<div class="flex items-center justify-between">
								<span class={`text-xs font-medium ${archived ? 'text-zinc-600' : 'text-zinc-400'}`}
									>Progress</span
								>
								<span class={`text-xs ${archived ? 'text-zinc-600' : 'text-zinc-500'}`}
									>{project.percentage || 0}%</span
								>
							</div>
							<div class="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
								<div
									class="h-full rounded-full transition-all duration-500 {project.colour &&
									!project.colour.startsWith('#')
										? project.colour
										: ''}"
									style:width="{project.percentage || 0}%"
									style:background-color={project.colour && project.colour.startsWith('#')
										? project.colour
										: ''}
									style:opacity={archived ? 0.5 : 1}
								></div>
							</div>
						</div>
					</div>

					<!-- Row 2: Funds/Dates & Actions -->
					<div
						class="flex flex-wrap items-end justify-between gap-4 border-t border-zinc-800/50 pt-3"
					>
						<!-- Funds & Dates -->
						<div class="flex items-center gap-6">
							<div class="flex flex-col gap-0.5">
								<span class="text-[10px] font-bold tracking-wider text-zinc-500 uppercase"
									>Funds</span
								>
								<span
									class={`text-sm font-medium ${archived ? 'text-zinc-500' : 'text-emerald-400'}`}
									>{formatFunds(project.funds)}</span
								>
							</div>
							{#if project.start_at || project.end_at}
								<div class="flex flex-col gap-0.5">
									<span class="text-[10px] font-bold tracking-wider text-zinc-500 uppercase"
										>Dates</span
									>
									<span class={`text-sm ${archived ? 'text-zinc-500' : 'text-zinc-300'}`}
										>{formatDate(project.start_at)} - {formatDate(project.end_at)}</span
									>
								</div>
							{/if}
						</div>

						<!-- Buttons -->
						<div class="flex items-center gap-2">
							<button
								onclick={() => openEdit(project)}
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
								onclick={() => handleDelete(project.id)}
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
				</li>
			{/snippet}

			<ul class="grid grid-cols-1 gap-4">
				{#each activeProjects as project}
					{@render projectCard(project, false)}
				{/each}
			</ul>

			{#if archivedProjects.length > 0}
				<div class="my-8 flex items-center gap-4">
					<div class="h-px flex-1 bg-zinc-800"></div>
					<span class="text-sm font-medium tracking-wider text-zinc-500 uppercase">Archived</span>
					<div class="h-px flex-1 bg-zinc-800"></div>
				</div>

				<ul class="grid grid-cols-1 gap-4">
					{#each archivedProjects as project}
						{@render projectCard(project, true)}
					{/each}
				</ul>
			{/if}
		{:else}
			<div class="w-full overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
				<div class="relative min-w-[800px]">
					<!-- Vertical Grid Lines -->
					<div class="pointer-events-none absolute inset-0">
						{#each ganttData.months as month}
							<div
								class="absolute top-8 bottom-0 border-l border-dashed border-zinc-800"
								style:left={`${((month.getTime() - ganttData.start.getTime()) / (ganttData.end.getTime() - ganttData.start.getTime())) * 100}%`}
							></div>
						{/each}
					</div>

					<!-- Header: Months -->
					<div
						class="relative z-10 mb-4 flex border-b border-zinc-800 pb-2 text-xs font-medium text-zinc-500"
					>
						<div class="relative h-6 flex-1">
							{#each ganttData.months as month}
								<div
									class="absolute -translate-x-1/2 transform text-center"
									style:left={`${((month.getTime() - ganttData.start.getTime()) / (ganttData.end.getTime() - ganttData.start.getTime())) * 100}%`}
								>
									{month.toLocaleDateString('en-US', { month: 'long' })}
								</div>
							{/each}
						</div>
					</div>

					<!-- Projects -->
					<div class="space-y-3">
						{#each ganttData.projects as project}
							<div
								class="group relative h-10 w-full rounded transition-colors hover:bg-zinc-800/30"
							>
								<div
									class="absolute top-1 flex flex-col gap-1"
									style={getGanttStyle(project, ganttData.start, ganttData.end)}
								>
									<div
										class="h-2 w-full rounded-full shadow-sm transition-all hover:brightness-110 {project.colour &&
										!project.colour.startsWith('#')
											? project.colour
											: 'bg-indigo-600'}"
										style:background-color={project.colour && project.colour.startsWith('#')
											? project.colour
											: undefined}
									></div>
									<span class="px-0.5 text-[10px] font-medium whitespace-nowrap text-zinc-400">
										{project.name}
									</span>
								</div>
							</div>
						{/each}
						{#if ganttData.projects.length === 0}
							<div class="p-4 text-center text-zinc-500">No projects with dates to display.</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	{/if}
</section>
