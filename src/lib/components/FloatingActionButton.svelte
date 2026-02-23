<script lang="ts">
	import { Plus } from 'lucide-svelte';
	import { settings } from '$lib/settingsStore.svelte';

	interface Props {
		onclick: () => void;
		visible: boolean;
		ariaLabel: string;
		/** Mobile bottom offset: '24' (default) or '8' for pages with less bottom padding */
		bottomMobile?: '8' | '24';
		/** Optional extra classes */
		class?: string;
	}

	let { onclick, visible, ariaLabel, bottomMobile = '24', class: className = '' }: Props = $props();
</script>

{#if visible}
	<button
		{onclick}
		class="fixed right-8 z-50 rounded-full border-2 p-4 shadow-lg/30 drop-shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:brightness-110 md:right-16 md:bottom-16 {className}"
		class:bottom-8={bottomMobile === '8'}
		class:bottom-24={bottomMobile === '24'}
		style="--accent-color: {settings.getAccentLightHex()}; background-color: {settings.getAccentHex()}/50; border-color: {settings.getAccentLightHex()}"
		aria-label={ariaLabel}
	>
		<Plus class="h-6 w-6 text-(--accent-color)" />
	</button>
{/if}
