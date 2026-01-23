<script lang="ts">
	import { supabase } from '$lib/supabaseClient';

	let { isOpen, entry, onClose } = $props();
	let imageUrl = $state<string | null>(null);

	$effect(() => {
		if (isOpen && entry?.image) {
			getSignedUrl(entry.image);
		} else {
			imageUrl = null;
		}
	});

	async function getSignedUrl(path: string) {
		const { data, error } = await supabase.storage.from('dailyPicture').createSignedUrl(path, 3600); // 1 hour

		if (data) {
			imageUrl = data.signedUrl;
		}
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

{#if isOpen && entry}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 backdrop-blur-sm md:p-4"
		onclick={handleBackgroundClick}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div
			class="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl md:max-h-[90vh]"
		>
			<div
				class="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-900 p-4 md:p-6"
			>
				<h2 class="text-xl font-bold text-zinc-100">Entry Details</h2>
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

			<div class="flex flex-col gap-6 p-4 md:p-6 lg:flex-row">
				<!-- Left Column: Info -->
				<div class="flex-1 space-y-6">
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
					<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
						{#each ['mood', 'energy', 'physical', 'sleep', 'meals'] as metric}
							{#if entry[metric] !== null && entry[metric] !== undefined}
								<div class="rounded-lg border border-zinc-800 bg-zinc-800/50 p-3">
									<h3 class="mb-1 text-xs font-medium tracking-wider text-zinc-400 uppercase">
										{metric}
									</h3>
									<p class="text-xl font-semibold text-indigo-400">{entry[metric]}</p>
								</div>
							{/if}
						{/each}
					</div>

					<!-- Status Tags -->
					<div class="flex flex-wrap gap-2">
						{#if entry.sickness}
							<span
								class="inline-flex items-center rounded-full border border-red-900/50 bg-red-900/30 px-2.5 py-0.5 text-xs font-medium text-red-400"
							>
								Sickness
							</span>
						{/if}
						{#if entry.calvin_day}
							<span
								class="inline-flex items-center rounded-full border border-indigo-900/50 bg-indigo-900/30 px-2.5 py-0.5 text-xs font-medium text-indigo-400"
							>
								Calvin Day
							</span>
						{/if}
						{#if entry.ihana}
							<span
								class="inline-flex items-center rounded-full border border-pink-900/50 bg-pink-900/30 px-2.5 py-0.5 text-xs font-medium text-pink-400"
							>
								Ihana
							</span>
						{/if}
						{#if entry.call_family}
							<span
								class="inline-flex items-center rounded-full border border-green-900/50 bg-green-900/30 px-2.5 py-0.5 text-xs font-medium text-green-400"
							>
								Call Family
							</span>
						{/if}
						{#if entry.cry}
							<span
								class="inline-flex items-center rounded-full border border-blue-900/50 bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-400"
							>
								Cry
							</span>
						{/if}
						{#if entry.sex}
							<span
								class="inline-flex items-center rounded-full border border-red-900/50 bg-red-900/30 px-2.5 py-0.5 text-xs font-medium text-red-400"
							>
								Sex
							</span>
						{/if}
					</div>

					<!-- Text Fields -->
					<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
						{#each ['work_type', 'study_type', 'culture_type', 'art_type', 'music_type', 'exercise_type', 'leisure_type'] as field}
							{#if entry[field]}
								<div>
									<h3 class="mb-1 text-sm font-medium text-zinc-400 capitalize">
										{field.replace('_type', '')}
									</h3>
									<p class="rounded-md border border-zinc-800/50 bg-zinc-800/30 p-2 text-zinc-200">
										{entry[field]}
									</p>
								</div>
							{/if}
						{/each}
					</div>

					<!-- Notes -->
					{#if entry.notes}
						<div class="border-t border-zinc-800 pt-4">
							<h3 class="mb-2 text-sm font-medium text-zinc-400">Notes</h3>
							<p
								class="rounded-lg border border-zinc-800/50 bg-zinc-800/30 p-4 whitespace-pre-wrap text-zinc-300"
							>
								{entry.notes}
							</p>
						</div>
					{/if}
				</div>

				<!-- Right Column: Image -->
				{#if imageUrl}
					<div class="flex-1 lg:max-w-md">
						<div class="sticky top-24">
							<h3 class="mb-2 text-sm font-medium text-zinc-400">Daily Picture</h3>
							<div class="relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
								<img src={imageUrl} alt="Daily entry" class="w-full object-contain" />
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
