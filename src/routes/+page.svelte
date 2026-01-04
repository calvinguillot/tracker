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
		<h1 class="text-2xl font-bold">Tracker</h1>
		{#if session}
			<div class="flex items-center gap-4">
				<a href="/full-table" class="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
					>Full Table View</a
				>
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
		<main
			class="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 py-12"
		>
			<h2 class="mb-6 text-xl font-semibold">Daily Tracking</h2>
			<button
				onclick={() => (isModalOpen = true)}
				class="rounded bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
			>
				Create New Entry
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
			<h2 class="text-xl font-semibold text-gray-900">Welcome to Tracker</h2>
			<p class="mt-2 text-gray-600">Please sign in to start tracking.</p>
		</div>
	{/if}
</div>
