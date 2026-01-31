<script lang="ts">
	import { settings, PALETTE, type SettingItem } from '$lib/settingsStore.svelte';
	import { Plus, Trash2, Save, Loader, Download } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { showAlert } from '$lib/alertStore.svelte';
	import { supabase } from '$lib/supabaseClient';

	let isLoading = $state(true);

	onMount(async () => {
		await settings.init();
		if (settings.settings.global_types.transition_duration === undefined) {
			settings.settings.global_types.transition_duration = 200;
		}
		isLoading = false;
	});

	async function handleSave() {
		await settings.saveSettings();
		showAlert('Settings saved successfully!', 'Success');
	}

	function addCallType() {
		const newId = Math.max(0, ...settings.settings.calls_types.map((t) => Number(t.id))) + 1;
		settings.settings.calls_types.push({ id: newId, label: 'New Type' });
	}

	function removeCallType(index: number) {
		settings.settings.calls_types.splice(index, 1);
	}

	function addProjectType() {
		const newId = Math.max(0, ...settings.settings.project_types.map((t) => Number(t.id))) + 1;
		settings.settings.project_types.push({
			id: newId,
			label: 'New Project Type',
			color: 'bg-zinc-500'
		});
	}

	function removeProjectType(index: number) {
		settings.settings.project_types.splice(index, 1);
	}

	function addTaskType() {
		const newId = Math.max(0, ...settings.settings.task_types.map((t) => Number(t.id))) + 1;
		settings.settings.task_types.push({
			id: String(newId),
			label: 'New Task Type',
			color: 'bg-zinc-500'
		});
	}

	function removeTaskType(index: number) {
		settings.settings.task_types.splice(index, 1);
	}

	// Note: notes_types are just the palette really, but if we want to customize WHICH colors are available
	// we can manage the list. For now, let's just show them as "Available Note Colors" (read-only or selectable subset?)
	// The requirement says "in the setting apge, we must be able to edit the types and and color pairs".
	// For notes, it says "in the notes we only have the color seelctor as it is".
	// The plan says "Note Colors: List of { color }".
	// Let's allow enabling/disabling colors from the full palette maybe? Or just a custom list.
	// Let's implement a custom list of colors for notes.

	function addNoteColor() {
		settings.settings.notes_types.push({ id: Date.now(), color: '#000000' });
	}

	function removeNoteColor(index: number) {
		settings.settings.notes_types.splice(index, 1);
	}

	// Helper for circle style
	function getCircleStyle(color: string) {
		const p = PALETTE.find((p) => p.class === color || p.hex === color);
		if (p) return `background-color: ${p.hex}`;
		return `background-color: ${color.startsWith('#') ? color : '#ccc'}`;
	}

	function convertToCSV(objArray: any[]) {
		if (!objArray || objArray.length === 0) return '';
		const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
		const headers = Object.keys(array[0]);
		let str = headers.join(',') + '\r\n';
		for (let i = 0; i < array.length; i++) {
			let line = '';
			for (const header of headers) {
				if (line !== '') line += ',';
				let item = array[i][header];
				if (item === null || item === undefined) {
					item = '';
				} else if (typeof item === 'object') {
					item = JSON.stringify(item).replace(/"/g, '""');
					item = `"${item}"`;
				} else {
					item = String(item).replace(/"/g, '""');
					if (item.search(/("|,|\n)/g) >= 0) item = `"${item}"`;
				}
				line += item;
			}
			str += line + '\r\n';
		}
		return str;
	}

	async function backupDatabase() {
		const tables = ['dailyTracking', 'projects', 'artCalls', 'notes', 'tasks'];
		for (const table of tables) {
			const { data, error } = await supabase.from(table).select('*');
			if (error) {
				console.error(`Error fetching ${table}:`, error);
				showAlert(`Error backing up ${table}: ${error.message}`, 'Error');
				continue;
			}
			if (!data || data.length === 0) continue;
			const csv = convertToCSV(data);
			const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
			const link = document.createElement('a');
			link.setAttribute('href', URL.createObjectURL(blob));
			link.setAttribute(
				'download',
				`${table}_backup_${new Date().toISOString().split('T')[0]}.csv`
			);
			link.style.visibility = 'hidden';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
	}
</script>

<div class="space-y-8 pb-20">
	<div class="flex items-center justify-between">
		<h2 class="text-2xl font-bold text-zinc-100">Settings</h2>
		<button
			onclick={handleSave}
			class="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
			style="background-color: {settings.getAccentHex()}"
		>
			<Save class="h-4 w-4" /> Save Changes
		</button>
	</div>

	{#if isLoading}
		<div class="flex h-48 items-center justify-center">
			<Loader class="h-6 w-6 animate-spin text-indigo-400" />
		</div>
	{:else}
		<!-- Global Accent -->
		<section class="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6">
			<h3 class="mb-4 text-lg font-semibold text-zinc-100">Global Settings</h3>
			<div class="space-y-6">
				<div class="flex items-center gap-4">
					<span class="text-sm font-medium text-zinc-400">Accent Color</span>
					<div class="flex flex-wrap gap-2">
						{#each PALETTE as color}
							<button
								class="h-6 w-6 rounded-full border border-zinc-700 transition-transform hover:scale-110 focus:ring-2 focus:ring-white focus:outline-none"
								style={`background-color: ${color.hex}; ${settings.settings.global_types.accent === color.class ? 'border-color: white; transform: scale(1.1);' : ''}`}
								onclick={() => (settings.settings.global_types.accent = color.class)}
								title={color.name}
							></button>
						{/each}
					</div>
				</div>

				<div class="flex items-center gap-4">
					<label for="transition_duration" class="text-sm font-medium text-zinc-400"
						>Transition Duration (ms)</label
					>
					<input
						type="number"
						id="transition_duration"
						bind:value={settings.settings.global_types.transition_duration}
						class="w-24 rounded-md border border-zinc-700 bg-zinc-800 p-2 text-sm text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
						min="0"
						step="50"
					/>
				</div>
			</div>
		</section>

		<!-- Art Call Types -->
		<section class="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold text-zinc-100">Art Call Types</h3>
				<button
					onclick={addCallType}
					class="flex items-center gap-1 text-xs transition-colors hover:brightness-125"
					style="color: {settings.getAccentLightHex()}"
				>
					<Plus class="h-4 w-4" /> Add Type
				</button>
			</div>
			<div class="space-y-3">
				{#each settings.settings.calls_types as type, i}
					<div class="flex items-center gap-3">
						<input
							type="text"
							bind:value={type.label}
							class="flex-1 rounded-md border border-zinc-700 bg-zinc-800 p-2 text-sm text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
							placeholder="Type Name"
						/>
						<button
							onclick={() => removeCallType(i)}
							class="text-zinc-500 hover:text-red-400"
							title="Remove"
						>
							<Trash2 class="h-4 w-4" />
						</button>
					</div>
				{/each}
			</div>
		</section>

		<!-- Project Types -->
		<section class="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold text-zinc-100">Project Types</h3>
				<button
					onclick={addProjectType}
					class="flex items-center gap-1 text-xs transition-colors hover:brightness-125"
					style="color: {settings.getAccentLightHex()}"
				>
					<Plus class="h-4 w-4" /> Add Type
				</button>
			</div>
			<div class="space-y-3">
				{#each settings.settings.project_types as type, i}
					<div class="flex flex-wrap items-center gap-3 sm:flex-nowrap">
						<div class="min-w-[200px] flex-1">
							<input
								type="text"
								bind:value={type.label}
								class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-sm text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
								placeholder="Type Name"
							/>
						</div>

						<!-- Color Picker -->
						<div
							class="flex flex-wrap items-center justify-center gap-1 rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-1.5 sm:justify-start"
						>
							{#each PALETTE as color}
								<button
									class="h-4 w-4 rounded-full border border-transparent transition-all hover:scale-110"
									style={`background-color: ${color.hex}; ${type.color === color.class ? 'border-color: white; transform: scale(1.2);' : 'opacity-60 hover:opacity-100'}`}
									onclick={() => (type.color = color.class)}
									title={color.name}
								></button>
							{/each}
						</div>

						<button
							onclick={() => removeProjectType(i)}
							class="text-zinc-500 hover:text-red-400"
							title="Remove"
						>
							<Trash2 class="h-4 w-4" />
						</button>
					</div>
				{/each}
			</div>
		</section>

		<!-- Task Types -->
		<section class="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold text-zinc-100">Task Types</h3>
				<button
					onclick={addTaskType}
					class="flex items-center gap-1 text-xs transition-colors hover:brightness-125"
					style="color: {settings.getAccentLightHex()}"
				>
					<Plus class="h-4 w-4" /> Add Type
				</button>
			</div>
			<div class="space-y-3">
				{#each settings.settings.task_types as type, i}
					<div class="flex flex-wrap items-center gap-3 sm:flex-nowrap">
						<div class="min-w-[200px] flex-1">
							<input
								type="text"
								bind:value={type.label}
								class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-sm text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
								placeholder="Type Name"
							/>
						</div>

						<!-- Color Picker -->
						<div
							class="flex flex-wrap items-center justify-center gap-1 rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-1.5 sm:justify-start"
						>
							{#each PALETTE as color}
								<button
									class="h-4 w-4 rounded-full border border-transparent transition-all hover:scale-110"
									style={`background-color: ${color.hex}; ${type.color === color.class ? 'border-color: white; transform: scale(1.2);' : 'opacity-60 hover:opacity-100'}`}
									onclick={() => (type.color = color.class)}
									title={color.name}
								></button>
							{/each}
						</div>

						<button
							onclick={() => removeTaskType(i)}
							class="text-zinc-500 hover:text-red-400"
							title="Remove"
						>
							<Trash2 class="h-4 w-4" />
						</button>
					</div>
				{/each}
			</div>
		</section>

		<section class="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold text-zinc-100">Daily Activity Types</h3>
				<div class="text-xs text-zinc-500">Comma-separated values</div>
			</div>
			<div class="space-y-4">
				{#each ['work', 'study', 'culture', 'art', 'music', 'exercise', 'leisure'] as category}
					<div>
						<label
							for={`daily_${category}`}
							class="mb-1 block text-sm font-medium text-zinc-400 capitalize">{category}</label
						>
						<textarea
							id={`daily_${category}`}
							value={settings.settings.daily_type[category]?.join(', ') || ''}
							oninput={(e) => {
								const val = (e.target as HTMLTextAreaElement).value;
								settings.settings.daily_type[category] = val
									.split(',')
									.map((s) => s.trim())
									.filter((s) => s.length > 0);
							}}
							rows="2"
							class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-sm text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
							placeholder={`e.g. Type 1, Type 2`}
						></textarea>
					</div>
				{/each}
			</div>
		</section>

		<!-- Backup Database -->
		<section class="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6">
			<h3 class="mb-4 text-lg font-semibold text-zinc-100">Backup Database</h3>
			<p class="mb-4 text-sm text-zinc-400">
				Download CSV backups of daily tracking, projects, art calls, notes, and tasks.
			</p>
			<button
				onclick={backupDatabase}
				class="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
			>
				<Download class="h-4 w-4" />
				Backup Database
			</button>
		</section>

		<!-- Note Colors -->
		<section class="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold text-zinc-100">Note Colors (Palette)</h3>
				<div class="text-xs text-zinc-500">Edit available colors for notes</div>
			</div>
			<div class="flex flex-wrap gap-2">
				{#each settings.settings.notes_types as type, i}
					<label
						class="relative h-6 w-6 cursor-pointer rounded-full border border-zinc-700 transition-transform focus-within:ring-2 focus-within:ring-white hover:scale-110"
						style={`background-color: ${type.color};`}
						title="Change Color"
					>
						<input
							type="color"
							bind:value={type.color}
							class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
						/>
					</label>
				{/each}
				<!-- <button
					onclick={addNoteColor}
					class="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-zinc-600 text-zinc-500 hover:border-zinc-400 hover:text-zinc-300"
					title="Add Color"
				>
					<Plus class="h-3 w-3" />
				</button> -->
			</div>
		</section>
	{/if}
</div>
