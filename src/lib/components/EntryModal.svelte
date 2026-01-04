<script lang="ts">
	let { isOpen, entry, onClose, onSave } = $props();

	let formData = $state({
		created_at: new Date().toISOString().split('T')[0],
		mood: null,
		energy: null,
		physical: null,
		sleep: null,
		meals: null,
		weight: null,
		sickness: false,
		work_type: '',
		study_type: '',
		culture_type: '',
		music_type: '',
		exercise_type: '',
		leisure_type: '',
		family_type: '',
		calvin_day: false,
		dreams_type: '',
		reminder_type: '',
		notes: ''
	});

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
                    work_type: entry.work_type ?? '',
                    study_type: entry.study_type ?? '',
                    culture_type: entry.culture_type ?? '',
                    music_type: entry.music_type ?? '',
                    exercise_type: entry.exercise_type ?? '',
                    leisure_type: entry.leisure_type ?? '',
                    family_type: entry.family_type ?? '',
                    calvin_day: entry.calvin_day ?? false,
                    dreams_type: entry.dreams_type ?? '',
                    reminder_type: entry.reminder_type ?? '',
                    notes: entry.notes ?? ''
                };
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
					work_type: '',
					study_type: '',
					culture_type: '',
					music_type: '',
					exercise_type: '',
					leisure_type: '',
					family_type: '',
					calvin_day: false,
					dreams_type: '',
					reminder_type: '',
					notes: ''
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
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onclick={handleBackgroundClick}
        onkeydown={handleKeydown}
        role="dialog"
        aria-modal="true"
        tabindex="-1"
    >
		<div class="bg-zinc-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col border border-zinc-800">
            <div class="p-6 border-b border-zinc-800 flex justify-between items-center sticky top-0 bg-zinc-900 z-10">
                <h2 class="text-xl font-bold text-zinc-100">{entry ? 'Edit Entry' : 'New Entry'}</h2>
                <button onclick={onClose} class="text-zinc-400 hover:text-zinc-200 transition-colors" aria-label="Close">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            
			<form onsubmit={handleSubmit} class="p-6 space-y-6">
                <!-- Date & Basic Info -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label for="created_at" class="block text-sm font-medium text-zinc-400 mb-1">Date</label>
                        <input type="date" id="created_at" bind:value={formData.created_at} required class="w-full rounded-md border-zinc-700 bg-zinc-800 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2" />
                    </div>
                     <div>
                        <label for="weight" class="block text-sm font-medium text-zinc-400 mb-1">Weight (kg)</label>
                        <input type="number" step="0.1" id="weight" bind:value={formData.weight} class="w-full rounded-md border-zinc-700 bg-zinc-800 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2" />
                    </div>
                </div>

                <!-- Metrics (1-5? Assuming smallint) -->
                <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {#each ['mood', 'energy', 'physical', 'sleep', 'meals'] as metric}
                        <div>
                            <label for={metric} class="block text-sm font-medium text-zinc-400 mb-1 capitalize">{metric}</label>
                            <input type="number" id={metric} bind:value={formData[metric]} class="w-full rounded-md border-zinc-700 bg-zinc-800 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2" />
                        </div>
                    {/each}
                </div>

                <!-- Checkboxes -->
                 <div class="flex gap-6">
                    <div class="flex items-center">
                        <input type="checkbox" id="sickness" bind:checked={formData.sickness} class="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500" />
                        <label for="sickness" class="ml-2 block text-sm text-zinc-300">Sickness</label>
                    </div>
                    <div class="flex items-center">
                        <input type="checkbox" id="calvin_day" bind:checked={formData.calvin_day} class="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500" />
                        <label for="calvin_day" class="ml-2 block text-sm text-zinc-300">Calvin Day</label>
                    </div>
                </div>

                <!-- Text Fields -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {#each ['work_type', 'study_type', 'culture_type', 'music_type', 'exercise_type', 'leisure_type', 'family_type', 'dreams_type', 'reminder_type'] as field}
                         <div>
                            <label for={field} class="block text-sm font-medium text-zinc-400 mb-1 capitalize">{field.replace('_type', '')}</label>
                            <input type="text" id={field} bind:value={formData[field]} class="w-full rounded-md border-zinc-700 bg-zinc-800 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2" />
                        </div>
                    {/each}
                </div>

                <!-- Notes -->
                <div>
                    <label for="notes" class="block text-sm font-medium text-zinc-400 mb-1">Notes</label>
                    <textarea id="notes" bind:value={formData.notes} rows="3" class="w-full rounded-md border-zinc-700 bg-zinc-800 text-zinc-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"></textarea>
                </div>

                <div class="pt-4 flex justify-end gap-3 sticky bottom-0 bg-zinc-900 border-t border-zinc-800 mt-6">
                    <button type="button" onclick={onClose} class="rounded-md bg-zinc-800 px-3.5 py-2.5 text-sm font-semibold text-zinc-200 shadow-sm ring-1 ring-inset ring-zinc-700 hover:bg-zinc-700">Cancel</button>
                    <button type="submit" class="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Save</button>
                </div>
			</form>
		</div>
	</div>
{/if}

