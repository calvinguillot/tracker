<script lang="ts">
	import { alertState, closeAlert } from '$lib/alertStore.svelte';
	import { fade } from 'svelte/transition';
	import { settings } from '$lib/settingsStore.svelte';

	function handleBackgroundClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			closeAlert(false);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			closeAlert(false);
		}
	}

	function handleConfirm() {
		closeAlert(true);
	}

	function handleCancel() {
		closeAlert(false);
	}
</script>

{#if alertState.isOpen}
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
		onclick={handleBackgroundClick}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		transition:fade={{ duration: settings.getTransitionDuration() }}
	>
		<div
			class="flex w-full max-w-sm flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl"
		>
			<div class="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 p-4">
				<h2 class="text-lg font-bold text-zinc-100">{alertState.title}</h2>
				<button
					onclick={handleCancel}
					class="text-zinc-400 transition-colors hover:text-zinc-200"
					aria-label="Close"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
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

			<div class="p-6">
				<p class="text-zinc-300">{alertState.message}</p>
			</div>

			<div class="flex justify-end gap-3 border-t border-zinc-800 bg-zinc-900 p-4">
				{#if alertState.type === 'confirm'}
					<button
						onclick={handleCancel}
						class="rounded-md bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 shadow-sm ring-1 ring-zinc-700 ring-inset hover:bg-zinc-700"
					>
						{alertState.cancelText}
					</button>
					<button
						onclick={handleConfirm}
						class={`rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 ${
							alertState.isDestructive
								? 'bg-red-600 hover:bg-red-500 focus-visible:outline-red-600'
								: 'bg-indigo-600 hover:bg-indigo-500 focus-visible:outline-indigo-600'
						}`}
					>
						{alertState.confirmText}
					</button>
				{:else}
					<button
						onclick={() => closeAlert(true)}
						class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
					>
						OK
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
