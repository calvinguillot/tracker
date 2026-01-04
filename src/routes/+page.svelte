<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import type { Session } from '@supabase/supabase-js';

	let { data } = $props();
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

<div class="container mx-auto p-4">
	<header class="mb-8 flex items-center justify-between">
		<h1 class="text-2xl font-bold">Tracker</h1>
		{#if session}
			<div class="flex items-center gap-4">
				<span class="text-sm text-gray-600">{session.user.email}</span>
				<button
					onclick={signOut}
					class="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
				>
					Sign Out
				</button>
			</div>
		{:else}
			<button
				onclick={signInWithGithub}
				class="rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
			>
				Sign In with GitHub
			</button>
		{/if}
	</header>

	{#if session}
		<main>
			<h2 class="mb-4 text-xl font-semibold">Daily Tracking</h2>
			{#if data.dailyTracking.length > 0}
				<ul class="space-y-2">
					{#each data.dailyTracking as dailyTracking}
						<li class="rounded border border-gray-100 bg-gray-50 p-3 shadow-sm">
							{dailyTracking.mood}
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-gray-500">No tracking data found.</p>
			{/if}
		</main>
	{/if}
</div>
