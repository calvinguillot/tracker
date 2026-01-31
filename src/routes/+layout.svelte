<script lang="ts">
	import './layout.css';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { page } from '$app/stores';
	import type { Session } from '@supabase/supabase-js';
	import { settings } from '$lib/settingsStore.svelte';
	import { App } from '@capacitor/app';
	import { Capacitor } from '@capacitor/core';
	import { goto } from '$app/navigation';
	import AlertModal from '$lib/components/AlertModal.svelte';
	import Navbar from '$lib/components/Navbar.svelte';

	let { children } = $props();
	let session = $state<Session | null>(null);

	onMount(() => {
		supabase.auth.getSession().then(({ data: { session: s } }) => {
			session = s;
			if (s) settings.init();
		});

		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_event, _session) => {
			session = _session;
			if (_session) settings.init();
		});

		// Handle Deep Links for Native Auth
		if (Capacitor.isNativePlatform()) {
			App.addListener('appUrlOpen', async ({ url }) => {
				console.log(`Debug: Received Deep Link ${url}`);
				if (url.includes('auth/callback')) {
					const urlObj = new URL(url);
					const code = urlObj.searchParams.get('code');
					if (code) {
						// Exchange code for session via Supabase
						const { error } = await supabase.auth.exchangeCodeForSession(code);
						if (error) {
							console.error('Error exchanging code from deep link:', error);
						} else {
							goto(`${base}/`);
						}
					}
				}
			});
		}

		return () => {
			subscription.unsubscribe();
			if (Capacitor.isNativePlatform()) {
				App.removeAllListeners();
			}
		};
	});
</script>

<svelte:head>
	<link rel="icon" href="{base}/calvin_surf.ico" />
	<title>CG Tracker 2026</title>
</svelte:head>

<div
	class="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 antialiased selection:bg-indigo-500 selection:text-white"
>
	<Navbar {session} />

	<div
		class="container mx-auto flex-1 p-4 pt-8"
		class:flex={!session && $page.url.pathname === base + '/'}
		class:flex-col={!session && $page.url.pathname === base + '/'}
	>
		{@render children()}
	</div>
	<footer class="border-t border-zinc-800 py-6 text-center text-sm text-zinc-500">
		© {new Date().getFullYear()} Calvin Guillot
	</footer>
</div>

<AlertModal />
