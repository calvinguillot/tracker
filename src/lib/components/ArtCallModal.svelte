<script lang="ts">
	import { settings } from '$lib/settingsStore.svelte';
	import { fade } from 'svelte/transition';
	let { isOpen, entry, onClose, onSave, onDelete } = $props<{
		isOpen: boolean;
		entry: any;
		onClose: () => void;
		onSave: (data: any) => void;
		onDelete?: (id: number) => void;
	}>();

	let formData = $state({
		name: '',
		location: '',
		type: null as number | null,
		funds: null as number | null,
		deadline: '',
		link: '',
		applied: false,
		group: false,
		idea: ''
	});

	$effect(() => {
		if (isOpen) {
			if (entry) {
				formData = {
					name: entry.name || '',
					location: entry.location || '',
					type: entry.type,
					funds: entry.funds,
					deadline: entry.deadline ? new Date(entry.deadline).toISOString().split('T')[0] : '',
					link: entry.link || '',
					applied: entry.applied || false,
					group: entry.group || false,
					idea: entry.idea || ''
				};
			} else {
				// Reset
				formData = {
					name: '',
					location: '',
					type: null,
					funds: null,
					deadline: '',
					link: '',
					applied: false,
					group: false,
					idea: ''
				};
			}
		}
	});

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
				<h2 class="text-xl font-bold text-zinc-100">{entry ? 'Edit Art Call' : 'New Art Call'}</h2>
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

				<!-- Location -->
				<div>
					<label for="location" class="mb-1 block text-sm font-medium text-zinc-400">Location</label
					>
					<input
						type="text"
						id="location"
						bind:value={formData.location}
						class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
					/>
				</div>

				<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
					<!-- Type -->
					<div>
						<label for="type" class="mb-1 block text-sm font-medium text-zinc-400">Type</label>
						<select
							id="type"
							bind:value={formData.type}
							class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
						>
							<option value={null}>Select Type</option>
							{#each settings.settings.calls_types as type}
								<option value={type.id}>{type.label}</option>
							{/each}
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

				<!-- Deadline -->
				<div>
					<label for="deadline" class="mb-1 block text-sm font-medium text-zinc-400">Deadline</label
					>
					<input
						type="date"
						id="deadline"
						bind:value={formData.deadline}
						class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
					/>
				</div>

				<!-- Link -->
				<div>
					<label for="link" class="mb-1 block text-sm font-medium text-zinc-400">Link</label>
					<input
						type="url"
						id="link"
						bind:value={formData.link}
						placeholder="https://"
						class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
					/>
				</div>

				<!-- Idea -->
				<div>
					<label for="idea" class="mb-1 block text-sm font-medium text-zinc-400">Idea</label>
					<textarea
						id="idea"
						bind:value={formData.idea}
						rows="3"
						class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
					></textarea>
				</div>

				<div class="flex gap-6">
					<!-- Applied Toggle -->
					<div class="flex items-center">
						<input
							type="checkbox"
							id="applied"
							bind:checked={formData.applied}
							class="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
						/>
						<label for="applied" class="ml-2 block text-sm font-medium text-zinc-300">Applied</label
						>
					</div>

					<!-- Group Toggle -->
					<div class="flex items-center">
						<input
							type="checkbox"
							id="group"
							bind:checked={formData.group}
							class="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-yellow-500 focus:ring-yellow-500"
						/>
						<label for="group" class="ml-2 block text-sm font-medium text-zinc-300">Group</label>
					</div>
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
