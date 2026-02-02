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

	const mobilePageTitle = $derived.by(() => {
		const path = $page.url.pathname;
		if (path === base + '/' || path === base + '') return 'Dashboard';
		if (path === base + '/daily') return 'Daily';
		if (path === base + '/artcalls') return 'Art Calls';
		if (path === base + '/projects') return 'Projects';
		if (path === base + '/tasks') return 'Tasks';
		if (path === base + '/notes') return 'Notes';
		if (path === base + '/experimental') return 'Experimental';
		if (path === base + '/settings') return 'Settings';
		return 'CG Tracker';
	});

	// Determine if we're on a secondary page (no bottom navbar shown)
	const isSecondaryPage = $derived.by(() => {
		const path = $page.url.pathname;
		return path.includes('/notes') || path.includes('/experimental') || path.includes('/settings');
	});
</script>

{#if session || $page.url.pathname !== base + '/'}
	<header
		class="navbar-safe-area sticky top-0 z-50 w-full backdrop-blur-md"
		style="background-color: {settings.getAccentHex()}/50"
	>
		<div class="container mx-auto grid grid-cols-[1fr_auto_1fr] items-center gap-4 p-4">
			<div class="justify-self-start">
				<a
					href="{base}/"
					class="home-icon-link group flex items-center transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2"
					aria-label="Home"
					onclick={() => (isMobileMenuOpen = false)}
				>
					<img
						src="{base}/icon.webp"
						alt="CG Tracker"
						class="h-8 w-8 rounded-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
					/>
				</a>
			</div>

			{#if session}
				<!-- Mobile: page title in center between icon and menu -->
				<div class="col-start-2 row-start-1 flex justify-center md:hidden">
					<span class="text-lg font-semibold text-zinc-100">{mobilePageTitle}</span>
				</div>
				<nav
					class="col-start-2 row-start-1 hidden items-center justify-center gap-2 md:flex"
					style="--accent-color: {settings.getAccentLightHex()}; background-color: {settings.getAccentHex()}/50"
				>
					<a
						href="{base}/"
						class="px-6 text-zinc-400 transition-colors hover:text-(--accent-color)"
						aria-label="Dashboard"
					>
						<LayoutDashboard class="h-6 w-6" />
					</a>
					<a
						href="{base}/daily"
						class="px-6 text-zinc-400 transition-colors hover:text-(--accent-color)"
						aria-label="Daily"
					>
						<Table class="h-6 w-6" />
					</a>
					<a
						href="{base}/artcalls"
						class="px-6 text-zinc-400 transition-colors hover:text-(--accent-color)"
						aria-label="Art Calls"
					>
						<Palette class="h-6 w-6" />
					</a>
					<a
						href="{base}/projects"
						class="px-6 text-zinc-400 transition-colors hover:text-(--accent-color)"
						aria-label="Projects"
					>
						<Folder class="h-6 w-6" />
					</a>
					<a
						href="{base}/tasks"
						class="px-6 text-zinc-400 transition-colors hover:text-(--accent-color)"
						aria-label="Tasks"
					>
						<CheckSquare class="h-6 w-6" />
					</a>
					<a
						href="{base}/notes"
						class="px-6 text-zinc-400 transition-colors hover:text-(--accent-color)"
						aria-label="Notes"
					>
						<StickyNote class="h-6 w-6" />
					</a>
					<a
						href="{base}/experimental"
						class="px-6 text-zinc-400 transition-colors hover:text-(--accent-color)"
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
						class="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-(--accent-color)"
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
	</header>
{/if}

<!-- Mobile Menu Overlay - Full screen, on top of everything -->
{#if session && isMobileMenuOpen}
	<div
		class="fixed top-[calc(4rem+var(--status-bar-height,0px))] right-0 bottom-0 left-0 z-60 flex flex-col bg-zinc-950/95 backdrop-blur-md md:hidden"
		style="--accent-color: {settings.getAccentLightHex()}"
	>
		<!-- Centered container with left-aligned items -->
		<div class="flex flex-1 flex-col items-center justify-center">
			<div class="flex flex-col gap-2">
				<a
					href="{base}/notes"
					class="flex items-center gap-3 rounded-md px-6 py-4 text-zinc-300 transition-colors hover:bg-zinc-800/50 hover:text-(--accent-color)"
					onclick={() => (isMobileMenuOpen = false)}
				>
					<StickyNote class="h-6 w-6" />
					<span class="text-lg font-medium">Notes</span>
				</a>
				<a
					href="{base}/experimental"
					class="flex items-center gap-3 rounded-md px-6 py-4 text-zinc-300 transition-colors hover:bg-zinc-800/50 hover:text-(--accent-color)"
					onclick={() => (isMobileMenuOpen = false)}
				>
					<FlaskConical class="h-6 w-6" />
					<span class="text-lg font-medium">Experimental</span>
				</a>
				<a
					href="{base}/settings"
					class="flex items-center gap-3 rounded-md px-6 py-4 text-zinc-300 transition-colors hover:bg-zinc-800/50 hover:text-(--accent-color)"
					onclick={() => (isMobileMenuOpen = false)}
				>
					<Settings class="h-6 w-6" />
					<span class="text-lg font-medium">Settings</span>
				</a>
			</div>
		</div>
		<!-- Sign out at bottom -->
		<div class="flex justify-center pb-8">
			<button
				onclick={() => {
					signOut();
					isMobileMenuOpen = false;
				}}
				class="flex items-center gap-3 rounded-md px-6 py-4 text-red-500 transition-colors hover:bg-zinc-800/50 hover:text-red-400"
			>
				<LogOut class="h-6 w-6" />
				<span class="text-lg font-medium">Sign Out</span>
			</button>
		</div>
	</div>
{/if}

<!-- Mobile Bottom Navbar -->
{#if session && !isSecondaryPage}
	{@const isDashboard = $page.url.pathname === base + '/' || $page.url.pathname === base + ''}
	{@const isDaily = $page.url.pathname === base + '/daily'}
	{@const isArtCalls = $page.url.pathname === base + '/artcalls'}
	{@const isProjects = $page.url.pathname === base + '/projects'}
	{@const isTasks = $page.url.pathname === base + '/tasks'}
	<nav
		class="fixed right-0 bottom-0 left-0 z-40 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md md:hidden"
		style="--accent-color: {settings.getAccentLightHex()}; background-color: {settings.getAccentHex()}/50"
	>
		<div class="flex items-center justify-around py-2">
			<a
				href="{base}/"
				class="flex flex-col items-center gap-1 p-2 transition-colors"
				class:text-zinc-400={!isDashboard}
				class:text-[var(--accent-color)]={isDashboard}
				aria-label="Dashboard"
			>
				<LayoutDashboard class="h-6 w-6" />
				<span class="text-[10px] font-medium">Dashboard</span>
			</a>
			<a
				href="{base}/daily"
				class="flex flex-col items-center gap-1 p-2 transition-colors"
				class:text-zinc-400={!isDaily}
				class:text-[var(--accent-color)]={isDaily}
				aria-label="Daily"
			>
				<Table class="h-6 w-6" />
				<span class="text-[10px] font-medium">Daily</span>
			</a>
			<a
				href="{base}/artcalls"
				class="flex flex-col items-center gap-1 p-2 transition-colors"
				class:text-zinc-400={!isArtCalls}
				class:text-[var(--accent-color)]={isArtCalls}
				aria-label="Art Calls"
			>
				<Palette class="h-6 w-6" />
				<span class="text-[10px] font-medium">Art Calls</span>
			</a>
			<a
				href="{base}/projects"
				class="flex flex-col items-center gap-1 p-2 transition-colors"
				class:text-zinc-400={!isProjects}
				class:text-[var(--accent-color)]={isProjects}
				aria-label="Projects"
			>
				<Folder class="h-6 w-6" />
				<span class="text-[10px] font-medium">Projects</span>
			</a>
			<a
				href="{base}/tasks"
				class="flex flex-col items-center gap-1 p-2 transition-colors"
				class:text-zinc-400={!isTasks}
				class:text-[var(--accent-color)]={isTasks}
				aria-label="Tasks"
			>
				<CheckSquare class="h-6 w-6" />
				<span class="text-[10px] font-medium">Tasks</span>
			</a>
		</div>
	</nav>
{/if}
