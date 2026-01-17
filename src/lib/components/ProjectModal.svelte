<script lang="ts">
	let { isOpen, entry, onClose, onSave } = $props();

	let formData = $state({
		name: '',
		description: '',
		requirements: '',
		funds: null as number | null,
		status: 0,
		percentage: 0,
		start_at: '',
		end_at: '',
		colour: 'bg-indigo-600'
	});

	$effect(() => {
		if (isOpen) {
			if (entry) {
				formData = {
					name: entry.name || '',
					description: entry.description || '',
					requirements: entry.requirements || '',
					funds: entry.funds,
					status: entry.status ?? 0,
					percentage: entry.percentage ?? 0,
					start_at: entry.start_at ? new Date(entry.start_at).toISOString().split('T')[0] : '',
					end_at: entry.end_at ? new Date(entry.end_at).toISOString().split('T')[0] : '',
					colour: entry.colour || 'bg-indigo-600'
				};
			} else {
				// Reset
				formData = {
					name: '',
					description: '',
					requirements: '',
					funds: null,
					status: 0,
					percentage: 0,
					start_at: '',
					end_at: '',
					colour: 'bg-indigo-600'
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

				<!-- Requirements -->
				<div>
					<label for="requirements" class="mb-1 block text-sm font-medium text-zinc-400"
						>Requirements</label
					>
					<textarea
						id="requirements"
						bind:value={formData.requirements}
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

				<!-- Percentage & Colour -->
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
						<label for="colour" class="mb-1 block text-sm font-medium text-zinc-400">Color</label>
						<select
							id="colour"
							bind:value={formData.colour}
							class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
						>
							<option value="bg-zinc-500">Zinc</option>
							<option value="bg-red-600">Red</option>
							<option value="bg-orange-600">Orange</option>
							<option value="bg-amber-500">Amber</option>
							<option value="bg-green-600">Green</option>
							<option value="bg-emerald-500">Emerald</option>
							<option value="bg-teal-500">Teal</option>
							<option value="bg-cyan-500">Cyan</option>
							<option value="bg-blue-600">Blue</option>
							<option value="bg-indigo-600">Indigo</option>
							<option value="bg-violet-600">Violet</option>
							<option value="bg-purple-600">Purple</option>
							<option value="bg-fuchsia-600">Fuchsia</option>
							<option value="bg-pink-600">Pink</option>
							<option value="bg-rose-600">Rose</option>
						</select>
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
						class="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
						>Save</button
					>
				</div>
			</form>
		</div>
	</div>
{/if}
