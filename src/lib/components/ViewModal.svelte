<script lang="ts">
	let { isOpen, entry, onClose } = $props();

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

{#if isOpen && entry}
	<div 
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onclick={handleBackgroundClick}
        onkeydown={handleKeydown}
        role="dialog"
        aria-modal="true"
        tabindex="-1"
    >
		<div class="bg-zinc-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col border border-zinc-800">
            <div class="p-6 border-b border-zinc-800 flex justify-between items-center sticky top-0 bg-zinc-900 z-10">
                <h2 class="text-xl font-bold text-zinc-100">Entry Details</h2>
                <button onclick={onClose} class="text-zinc-400 hover:text-zinc-200 transition-colors" aria-label="Close">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            
			<div class="p-6 space-y-6">
                <!-- Date -->
                <div>
                    <h3 class="text-sm font-medium text-zinc-400">Date</h3>
                    <p class="text-lg text-zinc-100">{entry.created_at}</p>
                </div>

                <!-- Weight -->
                 {#if entry.weight}
                    <div>
                        <h3 class="text-sm font-medium text-zinc-400">Weight</h3>
                        <p class="text-lg text-zinc-100">{entry.weight} kg</p>
                    </div>
                {/if}

                <!-- Metrics Grid -->
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {#each ['mood', 'energy', 'physical', 'sleep', 'meals'] as metric}
                        {#if entry[metric] !== null && entry[metric] !== undefined}
                            <div class="bg-zinc-800/50 p-3 rounded-lg border border-zinc-800">
                                <h3 class="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">{metric}</h3>
                                <p class="text-xl font-semibold text-indigo-400">{entry[metric]}</p>
                            </div>
                        {/if}
                    {/each}
                </div>

                <!-- Status Tags -->
                <div class="flex flex-wrap gap-2">
                    {#if entry.sickness}
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/30 text-red-400 border border-red-900/50">
                            Sickness
                        </span>
                    {/if}
                    {#if entry.calvin_day}
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-900/30 text-indigo-400 border border-indigo-900/50">
                            Calvin Day
                        </span>
                    {/if}
                </div>

                <!-- Text Fields -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {#each ['work_type', 'study_type', 'culture_type', 'music_type', 'exercise_type', 'leisure_type', 'family_type', 'dreams_type', 'reminder_type'] as field}
                        {#if entry[field]}
                            <div>
                                <h3 class="text-sm font-medium text-zinc-400 capitalize mb-1">{field.replace('_type', '')}</h3>
                                <p class="text-zinc-200 bg-zinc-800/30 p-2 rounded-md border border-zinc-800/50">{entry[field]}</p>
                            </div>
                        {/if}
                    {/each}
                </div>

                <!-- Notes -->
                {#if entry.notes}
                    <div class="border-t border-zinc-800 pt-4">
                        <h3 class="text-sm font-medium text-zinc-400 mb-2">Notes</h3>
                        <p class="text-zinc-300 whitespace-pre-wrap bg-zinc-800/30 p-4 rounded-lg border border-zinc-800/50">{entry.notes}</p>
                    </div>
                {/if}
			</div>
            
            <div class="p-6 border-t border-zinc-800 bg-zinc-900 rounded-b-xl sticky bottom-0">
                 <button onclick={onClose} class="w-full rounded-md bg-zinc-800 px-3.5 py-2.5 text-sm font-semibold text-zinc-200 shadow-sm ring-1 ring-inset ring-zinc-700 hover:bg-zinc-700 transition-colors">Close</button>
            </div>
		</div>
	</div>
{/if}

