<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { settings } from '$lib/settingsStore.svelte';
	import {
		LogOut,
		Table,
		LayoutDashboard,
		Palette,
		Menu,
		X,
		Folder,
		StickyNote,
		CheckSquare,
		Settings,
		FlaskConical
	} from 'lucide-svelte';
	import { Capacitor } from '@capacitor/core';
	import type { Session } from '@supabase/supabase-js';

	interface Props {
		session: Session | null;
	}

	let { session }: Props = $props();
	let isMobileMenuOpen = $state(false);

	async function signInWithGithub() {
		const redirectUrl = Capacitor.isNativePlatform()
			? 'com.cgtracker.app://auth/callback'
			: `${window.location.origin}${base}/auth/callback`;

		console.log(`Debug: Redirect URL is ${redirectUrl}`);

		const { error } = await supabase.auth.signInWithOAuth({
			provider: 'github',
			options: {
				redirectTo: redirectUrl
			}
		});
		if (error) console.error('Error signing in:', error);
	}

	async function signOut() {
		const { error } = await supabase.auth.signOut();
		if (error) console.error('Error signing out:', error);
	}
</script>

{#if session || $page.url.pathname !== base + '/'}
	<header class="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
		<div class="container mx-auto grid grid-cols-[1fr_auto_1fr] items-center gap-4 p-4">
			<div class="justify-self-start">
				<a
					href="{base}/"
					class="jiggle-link group flex text-2xl font-bold tracking-tight text-zinc-100 transition-colors"
					style="--accent-color: {settings.getAccentLightHex()}"
				>
					{#each 'CG Tracker 2026'.split('') as char, i}
						<span
							class="jiggle-char group-hover:text-[var(--accent-color)]"
							style="animation-delay: {i * 0.05}s"
						>
							{char}
						</span>
					{/each}
				</a>
			</div>

			{#if session}
				<nav
					class="hidden items-center justify-center gap-2 md:flex"
					style="--accent-color: {settings.getAccentLightHex()}"
				>
					<a
						href="{base}/"
						class="px-6 text-zinc-400 transition-colors hover:text-[var(--accent-color)]"
						aria-label="Dashboard"
					>
						<LayoutDashboard class="h-6 w-6" />
					</a>
					<a
						href="{base}/daily"
						class="px-6 text-zinc-400 transition-colors hover:text-[var(--accent-color)]"
						aria-label="Daily"
					>
						<Table class="h-6 w-6" />
					</a>
					<a
						href="{base}/artcalls"
						class="px-6 text-zinc-400 transition-colors hover:text-[var(--accent-color)]"
						aria-label="Art Calls"
					>
						<Palette class="h-6 w-6" />
					</a>
					<a
						href="{base}/projects"
						class="px-6 text-zinc-400 transition-colors hover:text-[var(--accent-color)]"
						aria-label="Projects"
					>
						<Folder class="h-6 w-6" />
					</a>
					<a
						href="{base}/tasks"
						class="px-6 text-zinc-400 transition-colors hover:text-[var(--accent-color)]"
						aria-label="Tasks"
					>
						<CheckSquare class="h-6 w-6" />
					</a>
					<a
						href="{base}/notes"
						class="px-6 text-zinc-400 transition-colors hover:text-[var(--accent-color)]"
						aria-label="Notes"
					>
						<StickyNote class="h-6 w-6" />
					</a>
					<a
						href="{base}/experimental"
						class="px-6 text-zinc-400 transition-colors hover:text-[var(--accent-color)]"
						aria-label="Experimental"
					>
						<FlaskConical class="h-6 w-6" />
					</a>
				</nav>

				<div
					class="hidden items-center justify-end gap-4 justify-self-end md:flex"
					style="--accent-color: {settings.getAccentLightHex()}"
				>
					<a
						href="{base}/settings"
						class="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-[var(--accent-color)]"
						aria-label="Settings"
					>
						<Settings class="h-6 w-6" />
					</a>
					<button
						onclick={signOut}
						class="rounded-full p-2 text-red-500 transition-colors hover:bg-zinc-800/50 hover:text-red-400"
						aria-label="Sign Out"
					>
						<LogOut class="h-6 w-6" />
					</button>
				</div>

				<!-- Mobile Menu Button -->
				<div class="col-start-3 flex justify-end md:hidden">
					<button
						onclick={() => (isMobileMenuOpen = !isMobileMenuOpen)}
						class="rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
						aria-label="Toggle Menu"
					>
						{#if isMobileMenuOpen}
							<X class="h-6 w-6" />
						{:else}
							<Menu class="h-6 w-6" />
						{/if}
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
					<div class="mt-2 font-mono text-[10px] text-zinc-500">
						Plat: {Capacitor.getPlatform()} | Native: {Capacitor.isNativePlatform()} <br />
						redir: {Capacitor.isNativePlatform() ? 'com.cgtracker.app://auth/callback' : 'web path'}
					</div>
				</div>
			{/if}
		</div>

		<!-- Mobile Menu Overlay -->
		{#if session && isMobileMenuOpen}
			<div
				class="container mx-auto flex flex-col gap-2 bg-zinc-950/95 p-4 md:hidden"
				style="--accent-color: {settings.getAccentLightHex()}"
			>
				<a
					href="{base}/"
					class="flex items-center gap-3 rounded-md p-3 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-[var(--accent-color)]"
					onclick={() => (isMobileMenuOpen = false)}
				>
					<LayoutDashboard class="h-5 w-5" />
					<span class="font-medium">Dashboard</span>
				</a>
				<a
					href="{base}/daily"
					class="flex items-center gap-3 rounded-md p-3 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-[var(--accent-color)]"
					onclick={() => (isMobileMenuOpen = false)}
				>
					<Table class="h-5 w-5" />
					<span class="font-medium">Daily</span>
				</a>
				<a
					href="{base}/artcalls"
					class="flex items-center gap-3 rounded-md p-3 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-[var(--accent-color)]"
					onclick={() => (isMobileMenuOpen = false)}
				>
					<Palette class="h-5 w-5" />
					<span class="font-medium">Art Calls</span>
				</a>
				<a
					href="{base}/projects"
					class="flex items-center gap-3 rounded-md p-3 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-[var(--accent-color)]"
					onclick={() => (isMobileMenuOpen = false)}
				>
					<Folder class="h-5 w-5" />
					<span class="font-medium">Projects</span>
				</a>
				<a
					href="{base}/tasks"
					class="flex items-center gap-3 rounded-md p-3 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-[var(--accent-color)]"
					onclick={() => (isMobileMenuOpen = false)}
				>
					<CheckSquare class="h-5 w-5" />
					<span class="font-medium">Tasks</span>
				</a>
				<a
					href="{base}/notes"
					class="flex items-center gap-3 rounded-md p-3 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-[var(--accent-color)]"
					onclick={() => (isMobileMenuOpen = false)}
				>
					<StickyNote class="h-5 w-5" />
					<span class="font-medium">Notes</span>
				</a>
				<a
					href="{base}/experimental"
					class="flex items-center gap-3 rounded-md p-3 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-[var(--accent-color)]"
					onclick={() => (isMobileMenuOpen = false)}
				>
					<FlaskConical class="h-5 w-5" />
					<span class="font-medium">Experimental</span>
				</a>
				<a
					href="{base}/settings"
					class="flex items-center gap-3 rounded-md p-3 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-[var(--accent-color)]"
					onclick={() => (isMobileMenuOpen = false)}
				>
					<Settings class="h-5 w-5" />
					<span class="font-medium">Settings</span>
				</a>
				<div class="my-2 border-t border-zinc-800"></div>
				<button
					onclick={() => {
						signOut();
						isMobileMenuOpen = false;
					}}
					class="flex w-full items-center gap-3 rounded-md p-3 text-left text-red-500 transition-colors hover:bg-zinc-800/50 hover:text-red-400"
				>
					<LogOut class="h-5 w-5" />
					<span class="font-medium">Sign Out</span>
				</button>
			</div>
		{/if}
	</header>
{/if}
