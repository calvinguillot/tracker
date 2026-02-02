<script lang="ts">
	import { settings } from '$lib/settingsStore.svelte';
	import { fade } from 'svelte/transition';
	import {
		Trash2,
		Plus,
		CheckSquare,
		Square,
		Link as LinkIcon,
		ExternalLink,
		GripVertical
	} from 'lucide-svelte';
	let { isOpen, entry, onClose, onSave, onDelete } = $props<{
		isOpen: boolean;
		entry: any;
		onClose: () => void;
		onSave: (data: any) => void;
		onDelete?: (id: number) => void;
	}>();

	let formData = $state({
		name: '',
		description: '',
		funds: null as number | null,
		status: 0,
		type: null as number | null,
		percentage: 0,
		start_at: '',
		end_at: '',
		colour: 'bg-indigo-600',
		checklist: [] as { id: string; title: string; items: { text: string; completed: boolean }[] }[],
		links: [] as { url: string; label: string }[]
	});

	let draggingItem = $state<{ listIndex: number; itemIndex: number } | null>(null);

	$effect(() => {
		if (isOpen) {
			if (entry) {
				formData = {
					name: entry.name || '',
					description: entry.description || '',
					funds: entry.funds,
					status: entry.status ?? 0,
					type: entry.type ?? null,
					percentage: entry.percentage ?? 0,
					start_at: entry.start_at ? new Date(entry.start_at).toISOString().split('T')[0] : '',
					end_at: entry.end_at ? new Date(entry.end_at).toISOString().split('T')[0] : '',
					colour: entry.colour || 'bg-indigo-600',
					checklist: Array.isArray(entry.checklist) ? entry.checklist : [],
					links: Array.isArray(entry.links) ? entry.links : []
				};
			} else {
				// Reset
				formData = {
					name: '',
					description: '',
					funds: null,
					status: 0,
					type: null,
					percentage: 0,
					start_at: '',
					end_at: '',
					colour: 'bg-indigo-600',
					checklist: [],
					links: []
				};
			}
		}
	});

	function handleTypeChange() {
		if (formData.type) {
			const t = settings.getProjectType(formData.type);
			if (t && t.color) {
				formData.colour = t.color;
			}
		}
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		onSave(formData);
	}

	function handleBackgroundClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	function createChecklist() {
		formData.checklist = [
			...formData.checklist,
			{ id: crypto.randomUUID(), title: 'New Checklist', items: [] }
		];
	}

	function removeChecklist(index: number) {
		formData.checklist = formData.checklist.filter((_, i) => i !== index);
	}

	function addChecklistItem(checklistIndex: number) {
		const list = formData.checklist[checklistIndex];
		list.items = [...list.items, { text: '', completed: false }];
		formData.checklist[checklistIndex] = list; // trigger reactivity
	}

	function removeChecklistItem(checklistIndex: number, itemIndex: number) {
		const list = formData.checklist[checklistIndex];
		list.items = list.items.filter((_, i) => i !== itemIndex);
		formData.checklist[checklistIndex] = list;
	}

	function toggleChecklistItem(checklistIndex: number, itemIndex: number) {
		const list = formData.checklist[checklistIndex];
		list.items[itemIndex].completed = !list.items[itemIndex].completed;
		formData.checklist[checklistIndex] = list;
	}

	function handleDragStart(e: DragEvent, listIndex: number, itemIndex: number) {
		draggingItem = { listIndex, itemIndex };
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.dropEffect = 'move';
		}
	}

	function handleDragOver(e: DragEvent, listIndex: number, itemIndex: number) {
		e.preventDefault();
		if (!draggingItem) return;
		// Ensure we are in the same list
		if (draggingItem.listIndex !== listIndex) return;
		if (draggingItem.itemIndex === itemIndex) return;

		const list = formData.checklist[listIndex];
		const sourceIndex = draggingItem.itemIndex;
		const targetIndex = itemIndex;

		const item = list.items[sourceIndex];
		const newItems = [...list.items];
		newItems.splice(sourceIndex, 1);
		newItems.splice(targetIndex, 0, item);

		list.items = newItems;
		formData.checklist[listIndex] = list;

		// Update dragging index
		draggingItem.itemIndex = targetIndex;
	}

	function handleDragEnd() {
		draggingItem = null;
	}

	function addLink() {
		formData.links = [...formData.links, { url: '', label: '' }];
	}

	function removeLink(index: number) {
		formData.links = formData.links.filter((_, i) => i !== index);
	}

	function openLink(url: string) {
		if (!url) return;
		// Add protocol if missing
		let target = url;
		if (!/^https?:\/\//i.test(target)) {
			target = 'https://' + target;
		}
		window.open(target, '_blank', 'noopener,noreferrer');
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 backdrop-blur-sm md:p-4"
		onclick={handleBackgroundClick}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		transition:fade={{ duration: settings.getTransitionDuration() }}
	>
		<div
			class="flex max-h-[95vh] w-full max-w-2xl flex-col overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl md:max-h-[90vh]"
		>
			<div
				class="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-900 p-4 md:p-6"
			>
				<h2 class="text-xl font-bold text-zinc-100">{entry ? 'Edit Project' : 'New Project'}</h2>
				<button
					onclick={onClose}
					class="text-zinc-400 transition-colors hover:text-zinc-200"
					aria-label="Close"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<form onsubmit={handleSubmit} class="space-y-6 p-4 md:p-6">
				<!-- Name -->
				<div>
					<label for="name" class="mb-1 block text-sm font-medium text-zinc-400">Name</label>
					<input
						type="text"
						id="name"
						bind:value={formData.name}
						required
						class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
					/>
				</div>

				<!-- Description -->
				<div>
					<label for="description" class="mb-1 block text-sm font-medium text-zinc-400"
						>Description</label
					>
					<textarea
						id="description"
						bind:value={formData.description}
						rows="3"
						class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
					></textarea>
				</div>

				<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
					<!-- Status -->
					<div>
						<label for="status" class="mb-1 block text-sm font-medium text-zinc-400">Status</label>
						<select
							id="status"
							bind:value={formData.status}
							class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
						>
							<option value={0}>Not Started</option>
							<option value={1}>In Progress</option>
							<option value={2}>Postponed</option>
							<option value={3}>Completed</option>
							<option value={4}>Cancelled</option>
						</select>
					</div>

					<!-- Funds -->
					<div>
						<label for="funds" class="mb-1 block text-sm font-medium text-zinc-400">Funds (€)</label
						>
						<input
							type="number"
							id="funds"
							bind:value={formData.funds}
							class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
						/>
					</div>
				</div>

				<!-- Percentage & Type -->
				<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
					<div>
						<label for="percentage" class="mb-1 block text-sm font-medium text-zinc-400"
							>Progress ({formData.percentage}%)</label
						>
						<input
							type="range"
							id="percentage"
							min="0"
							max="100"
							bind:value={formData.percentage}
							class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-700 accent-indigo-500"
						/>
					</div>

					<div>
						<label for="type" class="mb-1 block text-sm font-medium text-zinc-400">Type</label>
						<div class="flex items-center gap-2">
							<select
								id="type"
								bind:value={formData.type}
								onchange={handleTypeChange}
								class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
							>
								<option value={null}>Select Type</option>
								{#each settings.settings.project_types as t}
									<option value={t.id}>{t.label}</option>
								{/each}
							</select>
							{#if formData.colour}
								<div
									class="h-8 w-8 shrink-0 rounded-full border border-zinc-600 shadow-sm"
									style={formData.colour.startsWith('#')
										? `background-color: ${formData.colour}`
										: ''}
									class:bg-zinc-500={formData.colour === 'bg-zinc-500'}
									class:bg-red-600={formData.colour === 'bg-red-600'}
									class:bg-orange-600={formData.colour === 'bg-orange-600'}
									class:bg-amber-500={formData.colour === 'bg-amber-500'}
									class:bg-green-600={formData.colour === 'bg-green-600'}
									class:bg-emerald-500={formData.colour === 'bg-emerald-500'}
									class:bg-teal-500={formData.colour === 'bg-teal-500'}
									class:bg-cyan-500={formData.colour === 'bg-cyan-500'}
									class:bg-blue-600={formData.colour === 'bg-blue-600'}
									class:bg-indigo-600={formData.colour === 'bg-indigo-600'}
									class:bg-violet-600={formData.colour === 'bg-violet-600'}
									class:bg-purple-600={formData.colour === 'bg-purple-600'}
									class:bg-fuchsia-600={formData.colour === 'bg-fuchsia-600'}
									class:bg-pink-600={formData.colour === 'bg-pink-600'}
									class:bg-rose-600={formData.colour === 'bg-rose-600'}
								></div>
							{/if}
						</div>
					</div>
				</div>

				<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
					<!-- Start Date -->
					<div>
						<label for="start_at" class="mb-1 block text-sm font-medium text-zinc-400"
							>Start Date</label
						>
						<input
							type="date"
							id="start_at"
							bind:value={formData.start_at}
							class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
						/>
					</div>

					<!-- End Date -->
					<div>
						<label for="end_at" class="mb-1 block text-sm font-medium text-zinc-400">End Date</label
						>
						<input
							type="date"
							id="end_at"
							bind:value={formData.end_at}
							class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
						/>
					</div>
				</div>

				<!-- Checklists -->
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<span class="block text-sm font-medium text-zinc-400">Checklists</span>
						<button
							type="button"
							onclick={createChecklist}
							class="text-xs transition-colors hover:brightness-125"
							style="color: {settings.getAccentLightHex()}"
						>
							+ Add Checklist
						</button>
					</div>

					{#if formData.checklist && formData.checklist.length > 0}
						<div class="space-y-6">
							{#each formData.checklist as list, listIndex}
								<div class="rounded-lg border border-zinc-800 bg-zinc-800/30 p-4">
									<div class="mb-3 flex items-center justify-between gap-2">
										<input
											type="text"
											bind:value={list.title}
											placeholder="Checklist Title"
											class="w-full bg-transparent text-sm font-bold text-zinc-200 placeholder-zinc-600 focus:outline-none"
										/>
										<button
											type="button"
											onclick={() => removeChecklist(listIndex)}
											class="text-zinc-600 hover:text-red-400"
											title="Remove Checklist"
										>
											<Trash2 class="h-4 w-4" />
										</button>
									</div>

									<div class="space-y-2">
										{#each list.items as item, itemIndex}
											<div class="flex items-center gap-2">
												<button
													type="button"
													onclick={() => toggleChecklistItem(listIndex, itemIndex)}
													class="text-zinc-400 hover:text-zinc-200"
												>
													{#if item.completed}
														<CheckSquare class="h-5 w-5 text-emerald-500" />
													{:else}
														<Square class="h-5 w-5" />
													{/if}
												</button>
												<input
													type="text"
													bind:value={item.text}
													placeholder="Item description..."
													class={`w-full rounded-md border border-zinc-700 bg-zinc-800 p-1.5 text-sm text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${item.completed ? 'text-zinc-500 line-through' : ''}`}
												/>
												<div class="flex items-center gap-1">
													<div
														role="button"
														tabindex="0"
														class="cursor-grab p-1 text-zinc-600 hover:text-zinc-400 active:cursor-grabbing"
														draggable="true"
														ondragstart={(e) => handleDragStart(e, listIndex, itemIndex)}
														ondragover={(e) => handleDragOver(e, listIndex, itemIndex)}
														ondragend={handleDragEnd}
													>
														<GripVertical class="h-4 w-4" />
													</div>
													<button
														type="button"
														onclick={() => removeChecklistItem(listIndex, itemIndex)}
														class="p-1 text-zinc-500 hover:text-red-400"
													>
														<Trash2 class="h-3 w-3" />
													</button>
												</div>
											</div>
										{/each}
										<button
											type="button"
											onclick={() => addChecklistItem(listIndex)}
											class="mt-2 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
										>
											<Plus class="h-3 w-3" /> Add Item
										</button>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="rounded-lg border border-dashed border-zinc-800 p-4 text-center">
							<p class="text-sm text-zinc-500">No checklists yet</p>
						</div>
					{/if}
				</div>

				<!-- Links -->
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<span class="block text-sm font-medium text-zinc-400">Links</span>
						<button
							type="button"
							onclick={addLink}
							class="text-xs transition-colors hover:brightness-125"
							style="color: {settings.getAccentLightHex()}"
						>
							+ Add Link
						</button>
					</div>

					{#if formData.links && formData.links.length > 0}
						<div class="space-y-2">
							{#each formData.links as link, i}
								<div class="flex items-center gap-2">
									<div class="grid flex-1 grid-cols-1 gap-2 md:grid-cols-2">
										<input
											type="text"
											bind:value={link.label}
											placeholder="Label (optional)"
											class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-sm text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
										/>
										<input
											type="text"
											bind:value={link.url}
											placeholder="URL"
											class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-sm text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
										/>
									</div>
									<button
										type="button"
										onclick={() => openLink(link.url)}
										class="p-2 text-zinc-400 hover:text-indigo-400"
										title="Open Link"
										disabled={!link.url}
									>
										<ExternalLink class="h-4 w-4" />
									</button>
									<button
										type="button"
										onclick={() => removeLink(i)}
										class="p-2 text-zinc-400 hover:text-red-400"
										title="Remove Link"
									>
										<Trash2 class="h-4 w-4" />
									</button>
								</div>
							{/each}
						</div>
					{:else}
						<div class="rounded-lg border border-dashed border-zinc-800 p-4 text-center">
							<p class="text-sm text-zinc-500">No links yet</p>
						</div>
					{/if}
				</div>

				<div
					class="sticky bottom-0 mt-6 flex justify-between gap-3 border-t border-zinc-800 bg-zinc-900 pt-4"
				>
					<div>
						{#if entry && onDelete}
							<button
								type="button"
								onclick={() => onDelete(entry.id)}
								class="rounded-md bg-red-500/10 px-3.5 py-2.5 text-sm font-semibold text-red-400 shadow-sm ring-1 ring-red-500/20 transition-colors ring-inset hover:bg-red-500/20"
								>Delete</button
							>
						{/if}
					</div>
					<div class="flex gap-3">
						<button
							type="button"
							onclick={onClose}
							class="rounded-md bg-zinc-800 px-3.5 py-2.5 text-sm font-semibold text-zinc-200 shadow-sm ring-1 ring-zinc-700 ring-inset hover:bg-zinc-700"
							>Cancel</button
						>
						<button
							type="submit"
							class="rounded-md px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2"
							style="background-color: {settings.getAccentHex()}">Save</button
						>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}
