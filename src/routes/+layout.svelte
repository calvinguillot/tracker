<script lang="ts">
	import './layout.css';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { LogOut, Table, LayoutDashboard, Palette, Menu, X } from 'lucide-svelte';
	import type { Session } from '@supabase/supabase-js';
	import AlertModal from '$lib/components/AlertModal.svelte';

	let { children } = $props();
	let session = $state<Session | null>(null);
	let isMenuOpen = $state(false);

	onMount(() => {
		supabase.auth.getSession().then(({ data: { session: s } }) => {
			session = s;
		});

		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_event, _session) => {
			session = _session;
		});

		return () => subscription.unsubscribe();
	});

	async function signInWithGithub() {
		const { error } = await supabase.auth.signInWithOAuth({
			provider: 'github',
			options: {
				redirectTo: `${window.location.origin}${base}/auth/callback`
			}
		});
		if (error) console.error('Error signing in:', error);
	}

	async function signOut() {
		const { error } = await supabase.auth.signOut();
		if (error) console.error('Error signing out:', error);
		isMenuOpen = false;
	}

	function toggleMenu() {
		isMenuOpen = !isMenuOpen;
	}

	function closeMenu() {
		isMenuOpen = false;
	}
</script>

<svelte:head>
	<link rel="icon" href="{base}/calvin_surf.ico" />
	<title>CG Tracker 2026</title>
</svelte:head>

<div
	class="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 antialiased selection:bg-indigo-500 selection:text-white"
>
	<div class="container mx-auto flex-1 p-4">
		<header class="mb-8 flex items-center justify-between relative">
			<div>
				<a
					href="{base}/"
					class="jiggle-link flex text-2xl font-bold tracking-tight text-zinc-100 transition-colors hover:text-indigo-400"
					onclick={closeMenu}
				>
					{#each 'CG Tracker 2026'.split('') as char, i}
						<span class="jiggle-char" style="animation-delay: {i * 0.05}s">
							{char}
						</span>
					{/each}
				</a>
			</div>

			{#if session}
				<!-- Desktop Nav -->
				<nav class="hidden md:flex items-center justify-center gap-2">
					<a
						href="{base}/"
						class="px-6 text-zinc-400 transition-colors hover:text-indigo-400"
						aria-label="Dashboard"
					>
						<LayoutDashboard class="h-6 w-6" />
					</a>
					<a
						href="{base}/full-table"
						class="px-6 text-zinc-400 transition-colors hover:text-indigo-400"
						aria-label="Full Table"
					>
						<Table class="h-6 w-6" />
					</a>
					<a
						href="{base}/artcalls"
						class="px-6 text-zinc-400 transition-colors hover:text-indigo-400"
						aria-label="Art Calls"
					>
						<Palette class="h-6 w-6" />
					</a>
				</nav>

				<div class="hidden md:flex items-center justify-end gap-4">
					<button
						onclick={signOut}
						class="rounded-full p-2 text-red-500 transition-colors hover:bg-zinc-800/50 hover:text-red-400"
						aria-label="Sign Out"
					>
						<LogOut class="h-6 w-6" />
					</button>
				</div>

				<!-- Mobile Menu Button -->
				<button
					onclick={toggleMenu}
					class="md:hidden rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 z-50 relative"
					aria-label="Menu"
				>
					{#if isMenuOpen}
						<X class="h-6 w-6" />
					{:else}
						<Menu class="h-6 w-6" />
					{/if}
				</button>
			{:else}
				<div>
					<button
						onclick={signInWithGithub}
						class="rounded bg-zinc-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-800"
					>
						Sign In with GitHub
					</button>
				</div>
			{/if}
		</header>

		<!-- Mobile Menu Overlay -->
		{#if session && isMenuOpen}
			<div class="md:hidden fixed inset-0 z-40 bg-zinc-950/95 backdrop-blur-sm p-4 pt-24">
				<nav class="flex flex-col gap-4">
					<a
						href="{base}/"
						class="flex items-center gap-3 rounded-lg p-4 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-indigo-400 border border-zinc-800/50 bg-zinc-900/30"
						onclick={closeMenu}
					>
						<LayoutDashboard class="h-6 w-6" />
						<span class="text-lg font-medium">Dashboard</span>
					</a>
					<a
						href="{base}/full-table"
						class="flex items-center gap-3 rounded-lg p-4 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-indigo-400 border border-zinc-800/50 bg-zinc-900/30"
						onclick={closeMenu}
					>
						<Table class="h-6 w-6" />
						<span class="text-lg font-medium">Full Table</span>
					</a>
					<a
						href="{base}/artcalls"
						class="flex items-center gap-3 rounded-lg p-4 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-indigo-400 border border-zinc-800/50 bg-zinc-900/30"
						onclick={closeMenu}
					>
						<Palette class="h-6 w-6" />
						<span class="text-lg font-medium">Art Calls</span>
					</a>
					<button
						onclick={signOut}
						class="flex items-center gap-3 rounded-lg p-4 text-red-500 transition-colors hover:bg-zinc-900 hover:text-red-400 border border-red-900/20 bg-red-900/10 mt-4"
					>
						<LogOut class="h-6 w-6" />
						<span class="text-lg font-medium">Sign Out</span>
					</button>
				</nav>
			</div>
		{/if}

		{@render children()}
	</div>
	<footer class="border-t border-zinc-800 py-6 text-center text-sm text-zinc-500">
		© {new Date().getFullYear()} Calvin Guillot
	</footer>
</div>

<AlertModal />
