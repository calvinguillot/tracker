<script lang="ts">
	import { settings, PALETTE, type SettingItem } from '$lib/settingsStore.svelte';
	import { Plus, Trash2, Save, Loader } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { showAlert } from '$lib/alertStore.svelte';

	let isLoading = $state(true);

	onMount(async () => {
		await settings.init();
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
</script>

<div class="space-y-8 pb-20">
	<div class="flex items-center justify-between">
		<h2 class="text-2xl font-bold text-zinc-100">Settings</h2>
		<button
			onclick={handleSave}
			class="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
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
		</section>

		<!-- Art Call Types -->
		<section class="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold text-zinc-100">Art Call Types</h3>
				<button
					onclick={addCallType}
					class="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
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
					class="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
				>
					<Plus class="h-4 w-4" /> Add Type
				</button>
			</div>
			<div class="space-y-3">
				{#each settings.settings.project_types as type, i}
					<div class="flex items-center gap-3">
						<div class="flex-1">
							<input
								type="text"
								bind:value={type.label}
								class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-sm text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
								placeholder="Type Name"
							/>
						</div>

						<!-- Color Picker -->
						<div
							class="flex items-center gap-1 rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-1.5"
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
					class="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
				>
					<Plus class="h-4 w-4" /> Add Type
				</button>
			</div>
			<div class="space-y-3">
				{#each settings.settings.task_types as type, i}
					<div class="flex items-center gap-3">
						<div class="flex-1">
							<input
								type="text"
								bind:value={type.label}
								class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-sm text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
								placeholder="Type Name"
							/>
						</div>

						<!-- Color Picker -->
						<div
							class="flex items-center gap-1 rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-1.5"
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

		<!-- Note Colors -->
		<section class="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold text-zinc-100">Note Colors (Palette)</h3>
				<div class="text-xs text-zinc-500">Edit available colors for notes</div>
			</div>
			<div class="flex flex-wrap gap-3">
				{#each settings.settings.notes_types as type, i}
					<div class="group relative">
						<input
							type="color"
							bind:value={type.color}
							class="h-10 w-10 cursor-pointer rounded-full border-none bg-transparent p-0 transition-transform hover:scale-110"
							title="Change Color"
						/>
						<button
							onclick={() => removeNoteColor(i)}
							class="absolute -top-1 -right-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white shadow-sm group-hover:flex"
							title="Remove"
						>
							<span class="text-[10px] font-bold">×</span>
						</button>
					</div>
				{/each}
				<button
					onclick={addNoteColor}
					class="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-zinc-600 text-zinc-500 hover:border-zinc-400 hover:text-zinc-300"
					title="Add Color"
				>
					<Plus class="h-4 w-4" />
				</button>
			</div>
		</section>
	{/if}
</div>
