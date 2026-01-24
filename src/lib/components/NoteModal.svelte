<script lang="ts">
	import { settings } from '$lib/settingsStore.svelte';
	import { fade } from 'svelte/transition';
	let { isOpen, entry, onClose, onSave } = $props();

	let formData = $state({
		title: '',
		body: '',
		color: '#18181b' // Default zinc-900 like
	});

	$effect(() => {
		if (isOpen) {
			if (entry) {
				formData = {
					title: entry.title || '',
					body: entry.body || '',
					color: entry.color || '#18181b'
				};
			} else {
				// Reset
				formData = {
					title: '',
					body: '',
					color: '#18181b'
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
				<h2 class="text-xl font-bold text-zinc-100">{entry ? 'Edit Note' : 'New Note'}</h2>
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

				<!-- Body -->
				<div>
					<label for="body" class="mb-1 block text-sm font-medium text-zinc-400">Body</label>
					<textarea
						id="body"
						bind:value={formData.body}
						rows="10"
						class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
					></textarea>
				</div>

				<!-- Color Picker -->
				<div>
					<label for="color" class="mb-1 block text-sm font-medium text-zinc-400">Color</label>
					<div class="flex flex-wrap gap-2">
						{#each settings.settings.notes_types as type}
							<button
								type="button"
								class="h-8 w-8 rounded-full border border-zinc-700 transition-transform hover:scale-110 focus:ring-2 focus:ring-zinc-400 focus:outline-none"
								style="background-color: {type.color}; {formData.color === type.color
									? 'border-color: white; transform: scale(1.1);'
									: ''}"
								onclick={() => (formData.color = type.color ?? '#18181b')}
								aria-label="Select color {type.color}"
							></button>
						{/each}
					</div>
					<input type="hidden" name="color" bind:value={formData.color} />
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
						class="rounded-md px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2"
						style="background-color: {settings.getAccentHex()}">Save</button
					>
				</div>
			</form>
		</div>
	</div>
{/if}
