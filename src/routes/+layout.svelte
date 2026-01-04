<script lang="ts">
	import './layout.css';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { LogOut, Table, LayoutDashboard } from 'lucide-svelte';
	import type { Session } from '@supabase/supabase-js';

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
				redirectTo: `${window.location.origin}/auth/callback`
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
	<link rel="icon" href="/calvin_surf.ico" />
	<title>CG Tracker 2026</title>
</svelte:head>

<div
	class="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-indigo-500 selection:text-white"
>
	<div class="container mx-auto p-4">
		<header class="mb-8 flex items-center justify-between">
			<h1 class="text-2xl font-bold tracking-tight text-zinc-100">CG Tracker 2026</h1>
			{#if session}
				<div class="flex items-center gap-4">
					{#if $page.url.pathname === '/'}
						<a
							href="/full-table"
							class="text-zinc-400 transition-colors hover:text-indigo-400"
							aria-label="Full Table"
						>
							<Table class="h-6 w-6" />
						</a>
					{:else}
						<a
							href="/"
							class="text-zinc-400 transition-colors hover:text-indigo-400"
							aria-label="Dashboard"
						>
							<LayoutDashboard class="h-6 w-6" />
						</a>
					{/if}
					<button
						onclick={signOut}
						class="p-2 text-red-500 transition-colors hover:bg-zinc-800/50 hover:text-red-400 rounded-full"
						aria-label="Sign Out"
					>
						<LogOut class="h-6 w-6" />
					</button>
				</div>
			{:else}
				<button
					onclick={signInWithGithub}
					class="rounded bg-zinc-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-800"
				>
					Sign In with GitHub
				</button>
			{/if}
		</header>
		{@render children()}
	</div>
</div>
