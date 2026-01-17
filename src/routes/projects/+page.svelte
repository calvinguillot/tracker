<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import type { Session } from '@supabase/supabase-js';
	import { Loader, Plus, ArrowUp, ArrowDown } from 'lucide-svelte';
	import ProjectModal from '$lib/components/ProjectModal.svelte';
	import { showAlert, showConfirm } from '$lib/alertStore.svelte';

	type Project = {
		id: number;
		created_at: string;
		name: string;
		description: string | null;
		requirements: string | null;
		funds: number | null;
		status: number;
		percentage: number;
		start_at: string | null;
		end_at: string | null;
		colour: string | null;
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
		{#if session}
			<button
				onclick={openNew}
				class="fixed right-8 bottom-8 z-50 rounded-full bg-indigo-600 p-4 text-white shadow-lg transition-transform hover:scale-105 hover:bg-indigo-500"
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
		<ul class="grid grid-cols-1 gap-4">
			{#each projects as project}
				<li
					class="group relative flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900/80"
				>
					<!-- Row 1: Info & Progress -->
					<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
						<!-- Content Left -->
						<div class="flex min-w-0 flex-1 flex-col gap-2">
							<h3 class="truncate text-base font-bold text-zinc-100" title={project.name}>
								{project.name}
							</h3>
							{#if project.description}
								<p class="text-sm text-zinc-400">{project.description}</p>
							{/if}
							{#if project.requirements}
								<p
									class="mt-1 font-mono text-xs break-words whitespace-normal text-zinc-500 md:max-w-[50%]"
								>
									<span class="font-bold text-zinc-600">REQ:</span>
									{project.requirements}
								</p>
							{/if}
						</div>

						<!-- Content Right (Progress) -->
						<div class="flex w-full shrink-0 flex-col gap-2 md:w-56">
							<div class="flex justify-end">
								<span class="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400"
									>{getStatusLabel(project.status)}</span
								>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-xs font-medium text-zinc-400">Progress</span>
								<span class="text-xs text-zinc-500">{project.percentage || 0}%</span>
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
								<span class="text-sm font-medium text-emerald-400"
									>{formatFunds(project.funds)}</span
								>
							</div>
							{#if project.start_at || project.end_at}
								<div class="flex flex-col gap-0.5">
									<span class="text-[10px] font-bold tracking-wider text-zinc-500 uppercase"
										>Dates</span
									>
									<span class="text-sm text-zinc-300"
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
			{/each}
		</ul>
	{/if}
</section>
