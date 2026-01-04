<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import type { Session } from '@supabase/supabase-js';
	import EntryModal from '$lib/components/EntryModal.svelte';

	let { data } = $props();
	let session = $state<Session | null>(null);
	let isModalOpen = $state(false);

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

	async function handleSave(entry: any) {
		const { error } = await supabase.from('dailyTracking').insert(entry);
		if (error) {
			console.error('Error saving entry:', error);
			alert('Error saving entry: ' + error.message);
		} else {
			isModalOpen = false;
			alert('Entry saved successfully!');
		}
	}
</script>

<div class="container mx-auto p-4">
	<header class="mb-8 flex items-center justify-between">
		<h1 class="text-2xl font-bold tracking-tight text-zinc-100">Tracker</h1>
		{#if session}
			<div class="flex items-center gap-4">
				<a
					href="/full-table"
					class="text-sm font-semibold text-indigo-400 transition-colors hover:text-indigo-300"
					>Full Table</a
				>
				<button
					onclick={signOut}
					class="p-2 text-zinc-400 transition-colors hover:text-red-400"
					aria-label="Sign Out"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
						/>
					</svg>
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

	{#if session}
		<main class="flex min-h-[50vh] flex-col items-center justify-center">
			<button
				onclick={() => (isModalOpen = true)}
				class="rounded-full bg-indigo-600 p-8 text-white shadow-xl transition-all hover:scale-105 hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
				aria-label="Create New Entry"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-16 w-16"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 4v16m8-8H4"
					/>
				</svg>
			</button>

			<EntryModal
				isOpen={isModalOpen}
				entry={null}
				onClose={() => (isModalOpen = false)}
				onSave={handleSave}
			/>
		</main>
	{:else}
		<div class="py-12 text-center">
			<h2 class="text-xl font-semibold text-zinc-100">Welcome to Tracker</h2>
			<p class="mt-2 text-zinc-400">Please sign in to start tracking.</p>
		</div>
	{/if}
</div>
