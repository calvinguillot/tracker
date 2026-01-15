<script lang="ts">
	import './layout.css';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { LogOut, Table, LayoutDashboard, Palette } from 'lucide-svelte';
	import type { Session } from '@supabase/supabase-js';
	import AlertModal from '$lib/components/AlertModal.svelte';

	let { children } = $props();
	let session = $state<Session | null>(null);

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
		<header class="mb-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
			<div class="justify-self-start">
				<a
					href="{base}/"
					class="jiggle-link flex text-2xl font-bold tracking-tight text-zinc-100 transition-colors hover:text-indigo-400"
				>
					{#each 'CG Tracker 2026'.split('') as char, i}
						<span class="jiggle-char" style="animation-delay: {i * 0.05}s">
							{char}
						</span>
					{/each}
				</a>
			</div>

			{#if session}
				<nav class="flex items-center justify-center gap-2">
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

				<div class="flex items-center justify-end gap-4 justify-self-end">
					<button
						onclick={signOut}
						class="rounded-full p-2 text-red-500 transition-colors hover:bg-zinc-800/50 hover:text-red-400"
						aria-label="Sign Out"
					>
						<LogOut class="h-6 w-6" />
					</button>
				</div>
			{:else}
				<div class="col-start-3 justify-self-end">
					<button
						onclick={signInWithGithub}
						class="rounded bg-zinc-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-800"
					>
						Sign In with GitHub
					</button>
				</div>
			{/if}
		</header>
		{@render children()}
	</div>
	<footer class="border-t border-zinc-800 py-6 text-center text-sm text-zinc-500">
		© {new Date().getFullYear()} Calvin Guillot
	</footer>
</div>

<AlertModal />
