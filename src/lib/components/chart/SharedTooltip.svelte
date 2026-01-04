<script>
	import { getContext } from 'svelte';
	import { bisector } from 'd3-array';

	const { data, width, height, xScale, yGet, xGet, config } = getContext('LayerCake');

	let { formatTitle = (d) => d, formatValue = (d) => d, labels = {} } = $props();

	let visible = $state(false);
	let found = $state({});
	let x = $state(0);
	
	// Using bisector to find the closest point on X axis
	const bisectX = bisector((d) => $xGet(d)).right;

	function handleMouseMove(e) {
		const { left, top } = e.currentTarget.getBoundingClientRect();
		const offsetX = e.clientX - left;

		// Invert scale to get date
		const xVal = $xScale.invert(offsetX);
		
		// Find closest data point
		const index = bisectX($data, xVal, 1);
		const d0 = $data[index - 1];
		const d1 = $data[index];
		const d = !d0 || !d1 ? (d0 || d1) : (xVal - $xGet(d0) > $xGet(d1) - xVal ? d1 : d0);

		if (d) {
			found = d;
			x = $xScale($xGet(d));
			visible = true;
		} else {
			visible = false;
		}
	}

	function handleMouseLeave() {
		visible = false;
	}

</script>

<!-- Overlay for mouse events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="tooltip-trigger hidden md:block"
	style:width="{$width}px"
	style:height="{$height}px"
	onmousemove={handleMouseMove}
	onmouseleave={handleMouseLeave}
></div>

{#if visible && found}
	<div
		class="tooltip hidden md:block"
		style="left:{x}px; top: 0px;"
	>
		<div class="line" style:height="{$height}px"></div>
		<div class="content bg-white p-2 shadow rounded border border-gray-200 text-xs z-50 absolute top-0 transform -translate-x-1/2 mt-4 pointer-events-none whitespace-nowrap text-zinc-800">
			<div class="font-bold mb-1">{formatTitle($xGet(found))}</div>
			{#each Object.entries(labels) as [key, label]}
				{#if found[key] != null}
					<div class="flex items-center gap-2">
						<div class="w-2 h-2 rounded-full" style:background-color={label.color}></div>
						<span>{label.text}:</span>
						<span class="font-mono">{formatValue(found[key], key)}</span>
					</div>
				{/if}
			{/each}
		</div>
	</div>
{/if}

<style>
	.tooltip-trigger {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 10;
	}
	.tooltip {
		position: absolute;
		pointer-events: none;
		z-index: 20;
	}
	.line {
		position: absolute;
		width: 1px;
		background: #ccc;
		left: 0;
		top: 0;
	}
</style>
