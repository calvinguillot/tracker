<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { processImage } from '$lib/utils/image';
	import { showAlert } from '$lib/alertStore.svelte';
	import { settings } from '$lib/settingsStore.svelte';

	let { isOpen, entry, onClose, onSave, userId } = $props();

	let isUploading = $state(false);
	let imageFile = $state<File | null>(null);
	let imagePreview = $state<string | null>(null);

	let formData = $state({
		created_at: new Date().toISOString().split('T')[0],
		mood: null,
		energy: null,
		physical: null,
		sleep: null,
		meals: null,
		weight: null,
		sickness: false,
		work_type: [] as string[],
		study_type: [] as string[],
		culture_type: [] as string[],
		art_type: [] as string[],
		music_type: [] as string[],
		exercise_type: [] as string[],
		leisure_type: [] as string[],
		calvin_day: false,
		ihana: false,
		call_family: false,
		cry: false,
		sex: false,
		notes: '',
		image: null
	});

	// Helper to parse stored value (could be string, array, or null) into array
	function parseTypeValue(value: string | string[] | null | undefined): string[] {
		if (!value) return [];
		if (Array.isArray(value)) return value;
		// Handle comma-separated string
		return value.split(',').map(s => s.trim()).filter(Boolean);
	}

	// Helper to toggle a value in an array
	function toggleTypeValue(field: 'work_type' | 'study_type' | 'culture_type' | 'art_type' | 'music_type' | 'exercise_type' | 'leisure_type', value: string) {
		const current = formData[field];
		if (current.includes(value)) {
			formData[field] = current.filter(v => v !== value);
		} else {
			formData[field] = [...current, value];
		}
	}

	$effect(() => {
		if (isOpen) {
			if (entry) {
				// Copy entry properties to formData
				// Ensure nulls are handled if necessary, though formData initializes with them
				formData = {
					created_at: entry.created_at || new Date().toISOString().split('T')[0],
					mood: entry.mood,
					energy: entry.energy,
					physical: entry.physical,
					sleep: entry.sleep,
					meals: entry.meals,
					weight: entry.weight,
					sickness: entry.sickness ?? false,
					work_type: parseTypeValue(entry.work_type),
					study_type: parseTypeValue(entry.study_type),
					culture_type: parseTypeValue(entry.culture_type),
					art_type: parseTypeValue(entry.art_type),
					music_type: parseTypeValue(entry.music_type),
					exercise_type: parseTypeValue(entry.exercise_type),
					leisure_type: parseTypeValue(entry.leisure_type),
					calvin_day: entry.calvin_day ?? false,
					ihana: entry.ihana ?? false,
					call_family: entry.call_family ?? false,
					cry: entry.cry ?? false,
					sex: entry.sex ?? false,
					notes: entry.notes ?? '',
					image: entry.image ?? null
				};
				imageFile = null;
				imagePreview = null;
			} else {
				// Reset
				formData = {
					created_at: new Date().toISOString().split('T')[0],
					mood: null,
					energy: null,
					physical: null,
					sleep: null,
					meals: null,
					weight: null,
					sickness: false,
					work_type: [],
					study_type: [],
					culture_type: [],
					art_type: [],
					music_type: [],
					exercise_type: [],
					leisure_type: [],
					calvin_day: false,
					ihana: false,
					call_family: false,
					cry: false,
					sex: false,
					notes: '',
					image: null
				};
				imageFile = null;
				imagePreview = null;
			}
		}
	});

	async function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			imageFile = target.files[0];
			imagePreview = URL.createObjectURL(imageFile);
		}
	}

	async function handleRemoveImage() {
		if (formData.image) {
			const { error } = await supabase.storage.from('dailyPicture').remove([formData.image]);

			if (error) {
				showAlert('Failed to delete image: ' + error.message, 'Error');
				return;
			}

			formData.image = null;
			imageFile = null;
			imagePreview = null;
			showAlert('Image deleted successfully', 'Success');
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();

		let imagePath: string | null = formData.image;

		if (imageFile) {
			if (!userId) {
				showAlert('User ID is missing, cannot upload image', 'Error');
				return;
			}

			isUploading = true;
			try {
				const processedBlob = await processImage(imageFile);
				const fileName = `${userId}/${formData.created_at}.webp`;

				const { data, error } = await supabase.storage
					.from('dailyPicture')
					.upload(fileName, processedBlob, {
						contentType: 'image/webp',
						upsert: true
					});

				if (error) throw error;

				imagePath = data.path;
			} catch (error: any) {
				showAlert(`Image upload failed: ${error.message}`, 'Error');
				isUploading = false;
				return;
			}
			isUploading = false;
		}

		// Convert arrays back to comma-separated strings for storage
		const dataToSave = {
			...formData,
			image: imagePath,
			work_type: formData.work_type.join(', '),
			study_type: formData.study_type.join(', '),
			culture_type: formData.culture_type.join(', '),
			art_type: formData.art_type.join(', '),
			music_type: formData.music_type.join(', '),
			exercise_type: formData.exercise_type.join(', '),
			leisure_type: formData.leisure_type.join(', ')
		};
		onSave(dataToSave);
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
			class="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl md:max-h-[90vh]"
		>
			<div
				class="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-900 p-4 md:p-6"
			>
				<h2 class="text-xl font-bold text-zinc-100">{entry ? 'Edit Entry' : 'New Entry'}</h2>
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
				<!-- Date & Basic Info -->
				<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
					<div>
						<label for="created_at" class="mb-1 block text-sm font-medium text-zinc-400">Date</label
						>
						<input
							type="date"
							id="created_at"
							bind:value={formData.created_at}
							required
							class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
						/>
					</div>
					<div>
						<label for="weight" class="mb-1 block text-sm font-medium text-zinc-400"
							>Weight (kg)</label
						>
						<input
							type="number"
							step="0.1"
							id="weight"
							bind:value={formData.weight}
							class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
						/>
					</div>
				</div>

				<!-- Metrics (1-5? Assuming smallint) -->
				<div class="grid grid-cols-2 gap-4 md:grid-cols-5">
					{#each ['mood', 'energy', 'physical', 'sleep', 'meals'] as metric}
						<div>
							<label for={metric} class="mb-1 block text-sm font-medium text-zinc-400 capitalize"
								>{metric}</label
							>
							<input
								type="number"
								id={metric}
								bind:value={formData[metric as keyof typeof formData]}
								class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
							/>
						</div>
					{/each}
				</div>

				<!-- Checkboxes -->
				<div class="flex flex-wrap gap-6">
					<div class="flex items-center">
						<input
							type="checkbox"
							id="sickness"
							bind:checked={formData.sickness}
							class="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
						/>
						<label for="sickness" class="ml-2 block text-sm text-zinc-300">Sickness</label>
					</div>
					<div class="flex items-center">
						<input
							type="checkbox"
							id="calvin_day"
							bind:checked={formData.calvin_day}
							class="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
						/>
						<label for="calvin_day" class="ml-2 block text-sm text-zinc-300">Calvin Day</label>
					</div>
					<div class="flex items-center">
						<input
							type="checkbox"
							id="ihana"
							bind:checked={formData.ihana}
							class="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
						/>
						<label for="ihana" class="ml-2 block text-sm text-zinc-300">Ihana</label>
					</div>
					<div class="flex items-center">
						<input
							type="checkbox"
							id="call_family"
							bind:checked={formData.call_family}
							class="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
						/>
						<label for="call_family" class="ml-2 block text-sm text-zinc-300">Call Family</label>
					</div>
					<div class="flex items-center">
						<input
							type="checkbox"
							id="cry"
							bind:checked={formData.cry}
							class="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
						/>
						<label for="cry" class="ml-2 block text-sm text-zinc-300">Cry</label>
					</div>
					<div class="flex items-center">
						<input
							type="checkbox"
							id="sex"
							bind:checked={formData.sex}
							class="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
						/>
						<label for="sex" class="ml-2 block text-sm text-zinc-300">Sex</label>
					</div>
				</div>

				<!-- Activity Type Fields (Multi-select) -->
				<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
					{#each ['work_type', 'study_type', 'culture_type', 'art_type', 'music_type', 'exercise_type', 'leisure_type'] as field}
						{@const category = field.replace('_type', '')}
						{@const options = settings.settings.daily_type[category] || []}
						{@const typedField = field as 'work_type' | 'study_type' | 'culture_type' | 'art_type' | 'music_type' | 'exercise_type' | 'leisure_type'}
						{@const selectedValues = formData[typedField]}
						{@const currentValues = selectedValues.filter(v => !options.includes(v))}
						<div>
							<span class="mb-2 block text-sm font-medium text-zinc-400 capitalize"
								>{category}</span
							>
							{#if options.length > 0 || currentValues.length > 0}
								<div class="flex flex-wrap gap-2">
									<!-- Show current values that aren't in options list -->
									{#each currentValues as currentVal}
										<label
											class="flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors {selectedValues.includes(currentVal)
												? 'border-amber-500 bg-amber-500/20 text-amber-300'
												: 'border-zinc-600 bg-zinc-800 text-zinc-300 hover:border-zinc-500'}"
										>
											<input
												type="checkbox"
												checked={selectedValues.includes(currentVal)}
												onchange={() => toggleTypeValue(typedField, currentVal)}
												class="sr-only"
											/>
											<span>{currentVal}</span>
											<span class="text-xs text-amber-400">(current)</span>
										</label>
									{/each}
									<!-- Show options from settings -->
									{#each options as opt}
										<label
											class="flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors {selectedValues.includes(opt)
												? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
												: 'border-zinc-600 bg-zinc-800 text-zinc-300 hover:border-zinc-500'}"
										>
											<input
												type="checkbox"
												checked={selectedValues.includes(opt)}
												onchange={() => toggleTypeValue(typedField, opt)}
												class="sr-only"
											/>
											<span>{opt}</span>
										</label>
									{/each}
								</div>
							{:else}
								<p class="text-sm text-zinc-500 italic">No options configured in settings</p>
							{/if}
						</div>
					{/each}
				</div>

				<!-- Image -->
				<div>
					<label for="image" class="mb-1 block text-sm font-medium text-zinc-400">Image</label>
					<div class="flex items-center gap-4">
						<input
							type="file"
							id="image"
							accept="image/*"
							onchange={handleFileChange}
							class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
						/>
						{#if imagePreview}
							<p class="text-sm text-green-400">New image selected</p>
						{:else if formData.image}
							<div class="flex items-center gap-2">
								<p class="text-sm text-zinc-400">Current image set</p>
								<button
									type="button"
									onclick={handleRemoveImage}
									class="text-xs text-red-400 hover:text-red-300"
								>
									Remove
								</button>
							</div>
						{/if}
					</div>
				</div>

				<!-- Notes -->
				<div>
					<label for="notes" class="mb-1 block text-sm font-medium text-zinc-400">Notes</label>
					<textarea
						id="notes"
						bind:value={formData.notes}
						rows="3"
						class="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
					></textarea>
				</div>

				<div
					class="sticky bottom-0 mt-6 flex justify-end gap-3 border-t border-zinc-800 bg-zinc-900 pt-4"
				>
					<button
						type="button"
						onclick={onClose}
						disabled={isUploading}
						class="rounded-md bg-zinc-800 px-3.5 py-2.5 text-sm font-semibold text-zinc-200 shadow-sm ring-1 ring-zinc-700 ring-inset hover:bg-zinc-700 disabled:opacity-50"
						>Cancel</button
					>
					<button
						type="submit"
						disabled={isUploading}
						class="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
						>{isUploading ? 'Uploading...' : 'Save'}</button
					>
				</div>
			</form>
		</div>
	</div>
{/if}
