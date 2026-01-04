<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { supabase } from '$lib/supabaseClient';

	onMount(async () => {
		const code = new URL(window.location.href).searchParams.get('code');

		if (code) {
			const { error } = await supabase.auth.exchangeCodeForSession(code);
			if (error) {
				console.error('Error exchanging code for session:', error);
			}
		}
		
		// Redirect to home after handling auth or if no code found (already logged in?)
		goto(base || '/');
	});
</script>

<div class="flex h-screen items-center justify-center">
	<p>Completing sign in...</p>
</div>
