<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { Eye, Loader } from 'lucide-svelte';

	let { entry, onView } = $props();
	let imageUrl = $state<string | null>(null);
	let isImageLoading = $state(!!entry?.image);

	$effect(() => {
		if (entry?.image) {
			isImageLoading = true;
			getSignedUrl(entry.image);
		} else {
			imageUrl = null;
			isImageLoading = false;
		}
	});

	async function getSignedUrl(path: string) {
		const { data, error } = await supabase.storage.from('dailyPicture').createSignedUrl(path, 3600);
		if (data) {
			imageUrl = data.signedUrl;
		} else {
			isImageLoading = false;
		}
	}

	function handleImageLoad() {
		isImageLoading = false;
	}
</script>

<div
	class="group relative aspect-square overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900"
>
	{#if entry.image}
		{#if isImageLoading}
			<div class="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900">
				<Loader class="h-6 w-6 animate-spin text-zinc-600" />
			</div>
		{/if}

		{#if imageUrl}
			<img
				src={imageUrl}
				alt="Daily entry"
				onload={handleImageLoad}
				class={`h-full w-full object-cover transition-all duration-700 ${
					isImageLoading ? 'scale-105 opacity-0' : 'scale-100 opacity-100'
				} group-hover:scale-110`}
			/>
		{/if}
	{:else}
		<div class="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-700">
			<span class="text-xs">No Image</span>
			<span class="text-xs font-medium text-zinc-600">{entry.created_at}</span>
		</div>
	{/if}

	<div
		class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
	>
		<span class="font-bold text-white shadow-black drop-shadow-md">{entry.created_at}</span>
		<button
			onclick={() => onView(entry)}
			class="rounded-full bg-white/20 p-3 text-white backdrop-blur-sm transition-all hover:scale-110 hover:bg-white/40"
			aria-label="View Details"
		>
			<Eye class="h-6 w-6" />
		</button>
	</div>
</div>
