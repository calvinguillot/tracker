<script lang="ts">
	import { Trash2, Plus, ArrowUp, ArrowDown, CheckSquare, Square } from 'lucide-svelte';
	import { settings } from '$lib/settingsStore.svelte';

	let { isOpen, entry, onClose, onSave } = $props();

	let formData = $state({
		title: '',
		type: '',
		status: 'todo',
		body: '',
		deadline_at: '',
		completed_at: null as string | null,
		color: '#000000',
		checklist: null as { text: string; completed: boolean }[] | null
	});

	const statusOptions = [
		{ value: 'todo', label: 'To Do' },
		{ value: 'in_progress', label: 'In Progress' },
		{ value: 'done', label: 'Done' },
		{ value: 'archived', label: 'Archived' }
	];

	$effect(() => {
		if (isOpen) {
			if (entry) {
				formData = {
					title: entry.title || '',
					type: entry.type || '',
					status: entry.status || 'todo',
					body: entry.body || '',
					deadline_at: entry.deadline_at || '',
					completed_at: entry.completed_at || null,
					color: entry.color || '#000000',
					checklist: entry.checklist || null
				};
			} else {
				// Reset
				formData = {
					title: '',
					type: '',
					status: 'todo',
					body: '',
					deadline_at: '',
					completed_at: null,
					color: '#000000',
					checklist: null
				};
			}
		}
	});

	function handleSubmit(e: Event) {
		e.preventDefault();

		// Handle completed_at logic
		if (formData.status === 'done') {
			if (!formData.completed_at) {
				formData.completed_at = new Date().toISOString();
			}
		} else {
			formData.completed_at = null;
		}

		// Convert empty deadline to null for DB
		const payload = {
			...formData,
			deadline_at: formData.deadline_at || null
		};

		onSave(payload);
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
		formData.checklist = [];
	}

	function addChecklistItem() {
		if (!formData.checklist) formData.checklist = [];
		formData.checklist = [...formData.checklist, { text: '', completed: false }];
	}

	function removeChecklistItem(index: number) {
		if (!formData.checklist) return;
		formData.checklist = formData.checklist.filter((_, i) => i !== index);
		if (formData.checklist.length === 0) {
			formData.checklist = null;
		}
	}

	function toggleChecklistItem(index: number) {
		if (!formData.checklist) return;
		formData.checklist[index].completed = !formData.checklist[index].completed;
	}

	function moveChecklistItem(index: number, direction: 'up' | 'down') {
		if (!formData.checklist) return;

		const newIndex = direction === 'up' ? index - 1 : index + 1;
		if (newIndex < 0 || newIndex >= formData.checklist.length) return;

		const item = formData.checklist[index];
		const newChecklist = [...formData.checklist];
		newChecklist.splice(index, 1);
		newChecklist.splice(newIndex, 0, item);
		formData.checklist = newChecklist;
	}
	function handleTypeChange() {
		if (formData.type) {
			const t = settings.getTaskType(formData.type);
			if (t && t.color) {
				formData.color = t.color;
			}
		}
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
	>
		<div
			class="flex max-h-[95vh] w-full max-w-2xl flex-col overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl md:max-h-[90vh]"
		>
			<div
				class="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-900 p-4 md:p-6"
			>
				<h2 class="text-xl font-bold text-zinc-100">{entry ? 'Edit Task' : 'New Task'}</h2>
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
				<!-- Title -->
				<div>
					<label for="title" class="mb-1 block text-sm font-medium text-zinc-400">Title</label>
					<input
						type="text"
						id="title"
						bind:value={formData.title}
						required
						class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
					/>
				</div>

				<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
					<!-- Type -->
					<div>
						<label for="type" class="mb-1 block text-sm font-medium text-zinc-400">Type</label>
						<div class="flex items-center gap-2">
							<select
								id="type"
								bind:value={formData.type}
								onchange={handleTypeChange}
								class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
							>
								<option value="">Select Type</option>
								{#each settings.settings.task_types as t}
									<option value={t.id}>{t.label}</option>
								{/each}
							</select>
							{#if formData.color}
								<div
									class="h-8 w-8 flex-shrink-0 rounded-full border border-zinc-600 shadow-sm"
									style={formData.color.startsWith('#')
										? `background-color: ${formData.color}`
										: ''}
									class:bg-zinc-500={formData.color === 'bg-zinc-500'}
									class:bg-red-600={formData.color === 'bg-red-600'}
									class:bg-orange-600={formData.color === 'bg-orange-600'}
									class:bg-amber-500={formData.color === 'bg-amber-500'}
									class:bg-green-600={formData.color === 'bg-green-600'}
									class:bg-emerald-500={formData.color === 'bg-emerald-500'}
									class:bg-teal-500={formData.color === 'bg-teal-500'}
									class:bg-cyan-500={formData.color === 'bg-cyan-500'}
									class:bg-blue-600={formData.color === 'bg-blue-600'}
									class:bg-indigo-600={formData.color === 'bg-indigo-600'}
									class:bg-violet-600={formData.color === 'bg-violet-600'}
									class:bg-purple-600={formData.color === 'bg-purple-600'}
									class:bg-fuchsia-600={formData.color === 'bg-fuchsia-600'}
									class:bg-pink-600={formData.color === 'bg-pink-600'}
									class:bg-rose-600={formData.color === 'bg-rose-600'}
								></div>
							{/if}
						</div>
					</div>

					<!-- Status -->
					<div>
						<label for="status" class="mb-1 block text-sm font-medium text-zinc-400">Status</label>
						<select
							id="status"
							bind:value={formData.status}
							class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
						>
							{#each statusOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
				</div>

				<!-- Body -->
				<div>
					<label for="body" class="mb-1 block text-sm font-medium text-zinc-400">Description</label>
					<textarea
						id="body"
						bind:value={formData.body}
						rows="3"
						class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
					></textarea>
				</div>

				<!-- Checklist -->
				<div>
					<div class="mb-2 flex items-center justify-between">
						<span class="block text-sm font-medium text-zinc-400">Checklist</span>
						{#if !formData.checklist}
							<button
								type="button"
								onclick={createChecklist}
								class="text-xs text-indigo-400 hover:text-indigo-300"
							>
								+ Create Checklist
							</button>
						{/if}
					</div>

					{#if formData.checklist}
						<div class="space-y-2">
							{#each formData.checklist as item, i}
								<div class="flex items-center gap-2">
									<button
										type="button"
										onclick={() => toggleChecklistItem(i)}
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
										placeholder="Checklist item..."
										class={`w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 ${item.completed ? 'text-zinc-500 line-through' : ''}`}
									/>
									<div class="flex items-center gap-1">
										<button
											type="button"
											onclick={() => moveChecklistItem(i, 'up')}
											disabled={i === 0}
											class="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
										>
											<ArrowUp class="h-4 w-4" />
										</button>
										<button
											type="button"
											onclick={() => moveChecklistItem(i, 'down')}
											disabled={i === (formData.checklist?.length ?? 0) - 1}
											class="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
										>
											<ArrowDown class="h-4 w-4" />
										</button>
										<button
											type="button"
											onclick={() => removeChecklistItem(i)}
											class="p-1 text-red-500 hover:text-red-400"
										>
											<Trash2 class="h-4 w-4" />
										</button>
									</div>
								</div>
							{/each}
							<button
								type="button"
								onclick={addChecklistItem}
								class="mt-2 flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200"
							>
								<Plus class="h-4 w-4" /> Add Item
							</button>
						</div>
					{/if}
				</div>

				<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
					<!-- Deadline -->
					<div>
						<label for="deadline_at" class="mb-1 block text-sm font-medium text-zinc-400"
							>Deadline</label
						>
						<input
							type="date"
							id="deadline_at"
							bind:value={formData.deadline_at}
							class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
						/>
					</div>
				</div>

				<div
					class="sticky bottom-0 mt-6 flex justify-end gap-3 border-t border-zinc-800 bg-zinc-900 pt-4"
				>
					<button
						type="button"
						onclick={onClose}
						class="rounded-md bg-zinc-800 px-3.5 py-2.5 text-sm font-semibold text-zinc-200 shadow-sm ring-1 ring-zinc-700 ring-inset hover:bg-zinc-700"
						>Cancel</button
					>
					<button
						type="submit"
						class="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
						>Save</button
					>
				</div>
			</form>
		</div>
	</div>
{/if}
