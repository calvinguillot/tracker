<script lang="ts">
	import './layout.css';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { page } from '$app/stores';
	import type { Session } from '@supabase/supabase-js';
	import { settings } from '$lib/settingsStore.svelte';
	import { dataStore } from '$lib/dataStore.svelte';
	import { App } from '@capacitor/app';
	import { Capacitor } from '@capacitor/core';
	import { goto } from '$app/navigation';
	import { fade } from 'svelte/transition';
	import { LoaderCircle } from 'lucide-svelte';
	import AlertModal from '$lib/components/AlertModal.svelte';
	import Navbar from '$lib/components/Navbar.svelte';

	let { children } = $props();
	let session = $state<Session | null>(null);
	let authChecked = $state(false);

	// Determine if we're on a secondary page (no bottom navbar shown on mobile)
	const isSecondaryPage = $derived.by(() => {
		const path = $page.url.pathname;
		return path.includes('/notes') || path.includes('/experimental') || path.includes('/settings');
	});

	// Show bottom navbar padding only when logged in and not on secondary pages
	const showBottomNavbar = $derived(session && !isSecondaryPage);

	onMount(() => {
		// Android full-screen: reserve space for status bar so navbar doesn't overlap
		if (typeof document !== 'undefined' && Capacitor.getPlatform() === 'android') {
			document.documentElement.style.setProperty('--status-bar-height', '24px');
		}
		supabase.auth.getSession().then(async ({ data: { session: s } }) => {
			session = s;
			if (s) {
				await Promise.all([settings.init(), dataStore.init()]);
			}
			authChecked = true;
		});

		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange(async (_event, _session) => {
			session = _session;
			if (_session) {
				await Promise.all([settings.init(), dataStore.init()]);
			}
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
	<title>CG Tracker</title>
</svelte:head>

{#if !authChecked}
	<!-- Full-screen loader while checking authentication -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950"
		out:fade={{ duration: 300 }}
	>
		<div class="flex flex-col items-center gap-4">
			<LoaderCircle class="h-10 w-10 animate-spin" style="color: {settings.getAccentHex()}" />
			<span class="text-sm text-zinc-400">Loading data...</span>
		</div>
	</div>
{:else}
	<div
		class="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 antialiased selection:bg-indigo-500 selection:text-white"
	>
		<Navbar {session} />

		<div
			class="container mx-auto flex-1 p-4 pt-4"
			class:flex={!session && $page.url.pathname === base + '/'}
			class:flex-col={!session && $page.url.pathname === base + '/'}
			class:pb-20={showBottomNavbar}
			class:md:pb-4={showBottomNavbar}
		>
			{@render children()}
		</div>
		<footer
			class="border-t border-zinc-800 py-6 text-center text-sm text-zinc-500"
			class:hidden={showBottomNavbar}
			class:md:block={showBottomNavbar}
		>
			© {new Date().getFullYear()} Calvin Guillot
		</footer>
	</div>
{/if}

<AlertModal />
