<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import type { Session } from '@supabase/supabase-js';
	import { LoaderCircle, ArrowUp, ArrowDown, List, Globe } from 'lucide-svelte';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import ArtCallModal from '$lib/components/ArtCallModal.svelte';
	import { showAlert, showConfirm, alertState } from '$lib/alertStore.svelte';
	import { settings } from '$lib/settingsStore.svelte';
	import FloatingActionButton from '$lib/components/FloatingActionButton.svelte';
	import { dataStore } from '$lib/dataStore.svelte';
	import {
		MapLibre,
		GeoJSONSource,
		CircleLayer,
		SymbolLayer,
		GlobeControl,
		NavigationControl,
		Projection,
		FeatureState
	} from 'svelte-maplibre-gl';
	import type maplibregl from 'maplibre-gl';

	/** Max position offset in degrees applied at render to avoid stacking when multiple calls share a location. Adjust as needed. */
	const POSITION_JITTER = 0.01;

	function jitterCoord(id: number, axis: number, base: number): number {
		const n = ((id * 7919 + axis * 7829) % 10000) / 10000;
		return base + (n - 0.5) * 2 * POSITION_JITTER;
	}

	type ArtCall = {
		id: number;
		created_at: string;
		name: string;
		location: string;
		type: number | null;
		funds: number | null;
		deadline: string | null;
		link: string;
		applied: boolean;
		group: boolean;
		idea: string | null;
		latitude?: number | null;
		longitude?: number | null;
	};

	let session = $state<Session | null>(null);
	let artCalls = $derived(dataStore.artCalls);
	let isModalOpen = $state(false);
	let currentEntry = $state<ArtCall | null>(null);
	let appliedCount = $derived(artCalls.filter((call) => call.applied).length);

	// View mode: list or map
	let viewMode = $state<'list' | 'map'>('list');
	let mapRef = $state<maplibregl.Map | undefined>(undefined);
	let hoveredFeatureId = $state<number | undefined>(undefined);

	// Sorting state
	type SortField = 'name' | 'funds' | 'deadline' | 'created' | 'status';
	let sortField = $state<SortField>('deadline');
	let sortDirection = $state<'asc' | 'desc'>('asc');

	let sortedArtCalls = $derived(
		[...artCalls].sort((a, b) => {
			const modifier = sortDirection === 'asc' ? 1 : -1;

			if (sortField === 'name') {
				return a.name.localeCompare(b.name) * modifier;
			} else if (sortField === 'funds') {
				return ((a.funds ?? 0) - (b.funds ?? 0)) * modifier;
			} else if (sortField === 'deadline') {
				// Handle null deadlines (e.g. treat as far future or past?)
				// Let's treat null as "no deadline" -> far future if asc, far past if desc?
				// Actually, just simple string compare works for ISO dates, but handling nulls explicitly is better.
				const dateA = a.deadline
					? new Date(a.deadline).getTime()
					: modifier === 1
						? Infinity
						: -Infinity;
				const dateB = b.deadline
					? new Date(b.deadline).getTime()
					: modifier === 1
						? Infinity
						: -Infinity;
				return (dateA - dateB) * modifier;
			} else if (sortField === 'created') {
				const dateA = new Date(a.created_at).getTime();
				const dateB = new Date(b.created_at).getTime();
				return (dateA - dateB) * modifier;
			} else if (sortField === 'status') {
				const statusA = getStatus(a.deadline).isOpen ? 0 : 1;
				const statusB = getStatus(b.deadline).isOpen ? 0 : 1;
				return (statusA - statusB) * modifier;
			}
			return 0;
		})
	);

	let activeCalls = $derived(
		sortedArtCalls.filter((c) => getStatus(c.deadline).isOpen && !c.applied)
	);
	let archivedCalls = $derived(
		sortedArtCalls.filter((c) => !getStatus(c.deadline).isOpen || c.applied)
	);

	let hasBackfilled = $state(false);

	$effect(() => {
		if (!hasBackfilled && artCalls.length > 0) {
			const needsGeocode = artCalls.filter((c) => c.latitude == null && c.location?.trim());
			if (needsGeocode.length > 0) {
				hasBackfilled = true;
				backfillCoordinates(needsGeocode);
			}
		}
	});

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

	function openNew() {
		currentEntry = null;
		isModalOpen = true;
	}

	function openEdit(entry: ArtCall) {
		currentEntry = entry;
		isModalOpen = true;
	}

	async function handleDelete(id: number) {
		const confirmed = await showConfirm(
			'Are you sure you want to delete this art call?',
			'Delete Art Call',
			{ confirmText: 'Delete', isDestructive: true }
		);

		if (!confirmed) return;

		const { error } = await supabase.from('artCalls').delete().eq('id', id);

		if (error) {
			console.error('Error deleting art call:', error);
			showAlert('Error deleting: ' + error.message, 'Error');
		} else {
			showAlert('Art call deleted successfully!', 'Success');
			dataStore.deleteArtCall(id);
		}
	}

	async function geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
		if (!location?.trim()) return null;
		try {
			const res = await fetch(
				`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`,
				{ headers: { 'User-Agent': 'tracker-app' } }
			);
			const data = await res.json();
			if (Array.isArray(data) && data.length > 0) {
				return {
					lat: parseFloat(data[0].lat),
					lng: parseFloat(data[0].lon)
				};
			}
		} catch (e) {
			console.warn('Geocoding failed:', e);
		}
		return null;
	}

	async function backfillCoordinates(calls: ArtCall[]) {
		for (const call of calls) {
			const coords = await geocodeLocation(call.location);
			if (coords) {
				const { data } = await supabase
					.from('artCalls')
					.update({ latitude: coords.lat, longitude: coords.lng })
					.eq('id', call.id)
					.select()
					.single();
				if (data) dataStore.updateArtCall(data);
			}
			await new Promise((r) => setTimeout(r, 1100));
		}
	}

	async function handleDeleteFromModal(id: number) {
		const confirmed = await showConfirm(
			'Are you sure you want to delete this art call?',
			'Delete Art Call',
			{ confirmText: 'Delete', isDestructive: true }
		);

		if (!confirmed) return;

		const { error } = await supabase.from('artCalls').delete().eq('id', id);

		if (error) {
			console.error('Error deleting art call:', error);
			showAlert('Error deleting: ' + error.message, 'Error');
		} else {
			showAlert('Art call deleted successfully!', 'Success');
			isModalOpen = false;
			dataStore.deleteArtCall(id);
		}
	}

	async function handleSave(entry: any) {
		const { id: _id, ...rest } = entry;
		const coords = await geocodeLocation(entry.location || '');
		const payloadWithCoords = {
			...rest,
			latitude: coords?.lat ?? null,
			longitude: coords?.lng ?? null
		};
		const payloadWithoutCoords = { ...rest };

		async function doUpdate(p: Record<string, unknown>) {
			if (currentEntry) {
				return supabase.from('artCalls').update(p).eq('id', currentEntry.id).select().single();
			} else {
				return supabase.from('artCalls').insert(p).select().single();
			}
		}

		let { data, error } = await doUpdate(payloadWithCoords);

		if (error?.code === 'PGRST204') {
			({ data, error } = await doUpdate(payloadWithoutCoords));
		}

		if (error) {
			console.error('Error saving art call:', error);
			showAlert('Error saving: ' + error.message, 'Error');
		} else {
			showAlert('Art call saved successfully!', 'Success');
			isModalOpen = false;
			if (data) {
				currentEntry ? dataStore.updateArtCall(data) : dataStore.addArtCall(data);
			}
		}
	}

	async function handleToggleApplied(e: MouseEvent, call: ArtCall) {
		e.stopPropagation();
		const newApplied = !call.applied;
		const { data, error } = await supabase
			.from('artCalls')
			.update({ applied: newApplied })
			.eq('id', call.id)
			.select()
			.single();
		if (error) {
			showAlert('Error updating: ' + error.message, 'Error');
		} else if (data) {
			dataStore.updateArtCall(data);
		}
	}

	function handleMapClick(ev: maplibregl.MapMouseEvent) {
		if (!mapRef) return;
		const features = mapRef.queryRenderedFeatures(ev.point, {
			layers: ['artcalls-clusters', 'artcalls-unclustered']
		});
		if (features.length === 0) return;
		const props = features[0].properties;
		if (props?.point_count != null) {
			const clusterId = props.cluster_id;
			const source = mapRef.getSource('artcalls') as maplibregl.GeoJSONSource;
			if (source?.getClusterExpansionZoom) {
				source.getClusterExpansionZoom(clusterId).then((zoom) => {
					mapRef?.easeTo({ center: (features[0].geometry as any).coordinates, zoom });
				});
			}
		} else if (props?.id != null) {
			const call = artCalls.find((c) => c.id === props.id);
			if (call) openEdit(call);
		}
	}

	let geoJsonData = $derived({
		type: 'FeatureCollection' as const,
		features: artCalls
			.filter(
				(c) =>
					c.latitude != null && c.longitude != null && getStatus(c.deadline).isOpen && !c.applied
			)
			.map((c) => ({
				type: 'Feature' as const,
				id: c.id,
				geometry: {
					type: 'Point' as const,
					coordinates: [jitterCoord(c.id, 1, c.longitude!), jitterCoord(c.id, 2, c.latitude!)] as [
						number,
						number
					]
				},
				properties: { id: c.id }
			}))
	});

	const accentHex = $derived(settings.getAccentHex());

	const formatType = (value: number | null) => settings.getCallTypeLabel(value);
	const formatFunds = (value: number | null) => (value === null ? '—' : `€${value}`);
	const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString() : '—');
	const formatIdea = (value: string | null) => (value ? truncatePreview(value) : '—');
	function truncatePreview(text: string | null, max = 50) {
		if (!text) return '';
		return text.length > max ? text.slice(0, max) + '...' : text;
	}

	function getStatus(deadline: string | null) {
		if (!deadline) {
			return {
				label: 'Open',
				color: 'bg-emerald-500',
				bg: 'bg-emerald-500/10',
				text: 'text-emerald-400',
				isOpen: true
			};
		}

		const d = new Date(deadline);
		// Reset time to start of day for accurate comparison?
		// Or just raw comparison. Usually deadlines are effectively end of day.
		// Let's treat today as still open.
		const now = new Date();
		now.setHours(0, 0, 0, 0);
		d.setHours(0, 0, 0, 0);

		const isOpen = d >= now;

		return isOpen
			? {
					label: 'Open',
					color: 'bg-emerald-500',
					bg: 'bg-emerald-500/10',
					text: 'text-emerald-400',
					isOpen: true
				}
			: {
					label: 'Closed',
					color: 'bg-red-500',
					bg: 'bg-red-500/10',
					text: 'text-red-400',
					isOpen: false
				};
	}
</script>

<ArtCallModal
	isOpen={isModalOpen}
	entry={currentEntry}
	onClose={() => (isModalOpen = false)}
	onSave={handleSave}
	onDelete={handleDeleteFromModal}
/>

<section>
	<div class="flex flex-wrap items-center justify-between gap-4">
		<FloatingActionButton
			onclick={openNew}
			visible={!!(session && !isModalOpen && !alertState.isOpen)}
			ariaLabel="New Art Call"
		/>
	</div>

	{#if !session}
		<div class="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-400">
			Sign in to view art calls.
		</div>
	{:else if artCalls.length === 0}
		<div class="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-400">
			No art calls yet.
		</div>
	{:else}
		<!-- Sorting Controls + View Toggle -->
		<div class="mb-4 flex flex-wrap items-center justify-between gap-4 text-sm">
			<div class="flex items-center gap-2">
				<select
					bind:value={sortField}
					class="cursor-pointer rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 shadow-sm outline-none focus:border-indigo-500 focus:ring-indigo-500"
				>
					{#each ['name', 'funds', 'deadline', 'created', 'status'] as field}
						<option value={field}>{field.charAt(0).toUpperCase() + field.slice(1)}</option>
					{/each}
				</select>
				<button
					class="flex items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 p-1.5 text-zinc-400 shadow-sm transition-colors hover:bg-zinc-700 hover:text-zinc-100"
					onclick={() => (sortDirection = sortDirection === 'asc' ? 'desc' : 'asc')}
					aria-label="Toggle sort order"
				>
					{#if sortDirection === 'asc'}
						<ArrowUp class="h-4 w-4" />
					{:else}
						<ArrowDown class="h-4 w-4" />
					{/if}
				</button>
			</div>

			<div class="flex items-center gap-4">
				<span class="text-xs text-zinc-500">
					Applied {appliedCount} / {artCalls.length}
				</span>
				<!-- View Toggle -->
				<div class="flex items-center rounded-lg bg-zinc-800/50 p-1">
					<button
						class={`rounded-md p-1.5 transition-all ${viewMode === 'list' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-300'}`}
						onclick={() => (viewMode = 'list')}
						aria-label="List View"
					>
						<List class="h-4 w-4" />
					</button>
					<button
						class={`rounded-md p-1.5 transition-all ${viewMode === 'map' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-300'}`}
						onclick={() => (viewMode = 'map')}
						aria-label="Map View"
					>
						<Globe class="h-4 w-4" />
					</button>
				</div>
			</div>
		</div>

		{#if viewMode === 'map'}
			<div
				class="h-[calc(100vh-12rem)] min-h-[400px] overflow-hidden rounded-lg border border-zinc-800"
			>
				<MapLibre
					bind:map={mapRef}
					class="h-full w-full"
					style="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
					zoom={2}
					center={{ lng: 20, lat: 30 }}
					cursor={hoveredFeatureId != null ? 'pointer' : undefined}
					onclick={handleMapClick}
				>
					<Projection type="globe" />
					<NavigationControl />
					<GlobeControl />
					<GeoJSONSource
						id="artcalls"
						data={geoJsonData}
						cluster={true}
						clusterMaxZoom={11}
						clusterRadius={50}
					>
						<CircleLayer
							id="artcalls-clusters"
							filter={['has', 'point_count']}
							paint={{
								'circle-color': accentHex,
								'circle-radius': ['+', 10, ['sqrt', ['get', 'point_count']]],
								'circle-opacity': 0.8
							}}
						/>
						<SymbolLayer
							id="artcalls-cluster-count"
							filter={['has', 'point_count']}
							layout={{
								'text-field': ['get', 'point_count_abbreviated'],
								'text-size': 12
							}}
							paint={{ 'text-color': '#ffffff' }}
						/>
						<CircleLayer
							id="artcalls-unclustered"
							filter={['!', ['has', 'point_count']]}
							paint={{
								'circle-color': accentHex,
								'circle-radius': ['case', ['boolean', ['feature-state', 'hover'], false], 24, 8],
								'circle-radius-transition': { duration: 200, delay: 0 },
								'circle-opacity': 0.9
							}}
							onmousemove={(ev) => {
								hoveredFeatureId = ev.features?.[0]?.id as number | undefined;
							}}
							onmouseleave={() => {
								hoveredFeatureId = undefined;
							}}
						/>
						{#if hoveredFeatureId != null}
							<FeatureState source="artcalls" id={hoveredFeatureId} state={{ hover: true }} />
						{/if}
					</GeoJSONSource>
				</MapLibre>
			</div>
		{:else}
			{#snippet callCard(call: ArtCall)}
				{@const status = getStatus(call.deadline)}
				<div
					role="button"
					tabindex="0"
					class={`group relative flex w-full cursor-pointer flex-col justify-between rounded-lg border p-4 text-left transition-all ${
						status.isOpen
							? 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900/80'
							: 'border-zinc-800/60 bg-zinc-900/30 hover:border-zinc-700/60 hover:bg-zinc-900/40'
					}`}
					onclick={() => openEdit(call)}
					onkeydown={(e) => e.key === 'Enter' && openEdit(call)}
				>
					<div class="flex flex-col gap-3">
						<!-- Header: Name, Location, Status -->
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-2">
									<h3
										class={`truncate text-base font-bold ${
											status.isOpen ? 'text-zinc-100' : 'text-zinc-500'
										}`}
										title={call.name}
									>
										{call.name}
									</h3>
									<div
										class={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${status.bg} ${status.text} border-transparent text-center`}
									>
										{status.label}
									</div>
									{#if call.group}
										<div
											class="shrink-0 rounded-full border border-transparent bg-yellow-500/10 px-2 py-0.5 text-center text-[10px] font-medium text-yellow-500"
										>
											Group
										</div>
									{/if}
								</div>
								<div
									class={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ${
										status.isOpen ? 'text-zinc-400' : 'text-zinc-500'
									}`}
								>
									<span class="truncate">{call.location}</span>
									<span class="text-zinc-600">•</span>
									<span>{formatType(call.type)}</span>
								</div>
							</div>
							<button
								type="button"
								class={`rounded-md border px-2.5 py-1 text-sm font-medium transition-colors ${
									call.applied
										? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
										: 'border-zinc-600 bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-300'
								}`}
								onclick={(e) => handleToggleApplied(e, call)}
								aria-label={call.applied ? 'Mark as not applied' : 'Mark as applied'}
							>
								{call.applied ? 'Applied' : 'Not applied'}
							</button>
						</div>

						<!-- Idea Section -->
						<div class="mt-1 border-t border-zinc-800/50 pt-3">
							<p
								class={`text-sm ${status.isOpen && !call.applied ? 'text-zinc-300' : 'text-zinc-500'}`}
							>
								{formatIdea(call.idea)}
							</p>
						</div>

						<!-- Details Row -->
						<div
							class="mt-1 flex items-center justify-between gap-4 border-t border-zinc-800/50 pt-3"
						>
							<div class="flex gap-6">
								<div class="flex flex-col gap-0.5">
									<span class="text-[10px] font-bold tracking-wider text-zinc-500 uppercase"
										>Funds</span
									>
									<span
										class={`text-sm font-medium ${
											status.isOpen ? 'text-emerald-400' : 'text-zinc-500'
										}`}>{formatFunds(call.funds)}</span
									>
								</div>
								<div class="flex flex-col gap-0.5">
									<span class="text-[10px] font-bold tracking-wider text-zinc-500 uppercase"
										>Deadline</span
									>
									<span class={`text-sm ${status.isOpen ? 'text-zinc-300' : 'text-zinc-500'}`}>
										{formatDate(call.deadline)}
									</span>
								</div>
							</div>

							{#if call.link}
								<a
									class={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
										status.isOpen ? '' : 'bg-zinc-800/60 text-zinc-500 hover:bg-zinc-800'
									}`}
									style={status.isOpen
										? `--btn-bg: ${settings.getAccentHex()}1a; --btn-text: ${settings.getAccentLightHex()}; --btn-bg-hover: ${settings.getAccentHex()}33;`
										: ''}
									class:text-[var(--btn-text)]={status.isOpen}
									class:bg-[var(--btn-bg)]={status.isOpen}
									class:hover:bg-[var(--btn-bg-hover)]={status.isOpen}
									href={call.link}
									target="_blank"
									rel="noreferrer"
									onclick={(e) => e.stopPropagation()}
								>
									Link &rarr;
								</a>
							{/if}
						</div>
					</div>
				</div>
			{/snippet}

			<div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
				{#each activeCalls as call (call.id)}
					<div animate:flip={{ duration: 300 }} transition:fade={{ duration: 200 }}>
						{@render callCard(call)}
					</div>
				{/each}
			</div>

			{#if archivedCalls.length > 0}
				<div class="my-8 flex items-center gap-4">
					<div class="h-px flex-1 bg-zinc-800"></div>
					<span class="text-sm font-medium tracking-wider text-zinc-500 uppercase">Archived</span>
					<div class="h-px flex-1 bg-zinc-800"></div>
				</div>

				<div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
					{#each archivedCalls as call (call.id)}
						<div animate:flip={{ duration: 300 }} transition:fade={{ duration: 200 }}>
							{@render callCard(call)}
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	{/if}
</section>
