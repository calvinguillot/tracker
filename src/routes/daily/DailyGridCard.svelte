<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { Eye, LoaderCircle } from 'lucide-svelte';
	import { settings } from '$lib/settingsStore.svelte';
	import { getCachedUrl, setCachedUrl } from '$lib/imageUrlCache';

	let { entry, onView } = $props();
	let imageUrl = $state<string | null>(null);
	let imageLoaded = $state(false);

	let isImageLoading = $derived(!!entry?.image && !imageLoaded);

	$effect(() => {
		if (entry?.image) {
			const cached = getCachedUrl(entry.image);
			if (cached) {
				imageUrl = cached;
				// imageLoaded stays false until img onload fires
				return;
			}
			imageLoaded = false;
			getSignedUrl(entry.image);
		} else {
			imageUrl = null;
			imageLoaded = false;
		}
	});

	async function getSignedUrl(path: string) {
		const { data, error } = await supabase.storage.from('dailyPicture').createSignedUrl(path, 3600);
		if (data) {
			setCachedUrl(path, data.signedUrl);
			imageUrl = data.signedUrl;
		}
		isImageLoading = false;
	}

	function handleImageLoad() {
		imageLoaded = true;
	}
</script>

<div
	class="group relative aspect-square overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900"
>
	{#if entry.image}
		{#if isImageLoading}
			<div class="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900">
				<LoaderCircle class="h-6 w-6 animate-spin" style="color: {settings.getAccentHex()}" />
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
