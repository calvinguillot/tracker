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

		// Handle Deep Links for Native Auth (custom scheme com.cgtracker.app://auth/callback)
		if (Capacitor.isNativePlatform()) {
			App.addListener('appUrlOpen', async ({ url }) => {
				if (!url.includes('auth/callback')) return;
				try {
					const urlObj = new URL(url);
					// PKCE flow: code in query string
					const code = urlObj.searchParams.get('code');
					if (code) {
						const { error } = await supabase.auth.exchangeCodeForSession(code);
						if (error) {
							console.error('Error exchanging code from deep link:', error);
							return;
						}
						goto(`${base}/`);
						return;
					}
					// Implicit / token flow: access_token and refresh_token in hash
					const hash = urlObj.hash?.replace('#', '') ?? '';
					const params = new URLSearchParams(hash);
					const access_token = params.get('access_token');
					const refresh_token = params.get('refresh_token');
					if (access_token && refresh_token) {
						const { error } = await supabase.auth.setSession({
							access_token,
							refresh_token
						});
						if (error) {
							console.error('Error setting session from deep link:', error);
							return;
						}
						// Ensure auth state notifies subscribers (see supabase/auth-js#581)
						await supabase.auth.refreshSession();
						goto(`${base}/`);
					}
				} catch (e) {
					console.error('Error handling auth deep link:', e);
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
