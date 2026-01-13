<script>
	import { getContext } from 'svelte';

	const { xRange, yScale, width } = getContext('LayerCake');

	let {
		tickMarks = false,
		labelPosition = 'even',
		snapBaselineLabel = false,
		gridlines = true,
		tickMarkLength = undefined,
		format = (d) => d,
		ticks = 4,
		tickGutter = 0,
		dx = 0,
		dy = 0,
		charPixelWidth = 7.25
	} = $props();

	function calcStringLength(sum, val) {
		if (val === ',' || val === '.') return sum + charPixelWidth * 0.5;
		return sum + charPixelWidth;
	}

	let isBandwidth = $derived(typeof $yScale.bandwidth === 'function');

	let tickVals = $derived(
		Array.isArray(ticks)
			? ticks
			: isBandwidth
				? $yScale.domain()
				: typeof ticks === 'function'
					? ticks($yScale.ticks())
					: $yScale.ticks(ticks)
	);

	let widestTickLen = $derived(
		Math.max(
			10,
			Math.max(...tickVals.map((d) => format(d).toString().split('').reduce(calcStringLength, 0)))
		)
	);

	let tickLen = $derived(
		tickMarks === true
			? labelPosition === 'above'
				? (tickMarkLength ?? widestTickLen)
				: (tickMarkLength ?? 6)
			: 0
	);

	let x1 = $derived(-tickGutter - (labelPosition === 'above' ? widestTickLen : tickLen));
	let y = $derived(isBandwidth ? $yScale.bandwidth() / 2 : 0);
	let maxTickValPx = $derived(Math.max(...tickVals.map($yScale)));
</script>

<g class="axis y-axis">
	{#each tickVals as tick (tick)}
		{@const tickValPx = $yScale(tick)}
		<g class="tick tick-{tick}" transform="translate({$xRange[0]}, {tickValPx})">
			{#if gridlines === true}
				<line class="gridline" {x1} x2={$width} y1={y} y2={y}></line>
			{/if}
			{#if tickMarks === true}
				<line class="tick-mark" {x1} x2={x1 + tickLen} y1={y} y2={y}></line>
			{/if}
			<text
				{x1}
				{y}
				dx={dx + (labelPosition === 'even' ? -3 : 0)}
				text-anchor={labelPosition === 'above' ? 'start' : 'end'}
				dy={dy +
					(labelPosition === 'above' || (snapBaselineLabel === true && tickValPx === maxTickValPx)
						? -3
						: 4)}>{format(tick)}</text
			>
		</g>
	{/each}
</g>

<style>
	.tick {
		font-size: 12px;
		font-weight: 500;
	}

	.tick line {
		stroke: #3f3f46;
	}
	.tick .gridline {
		stroke-dasharray: 2;
	}

	.tick text {
		fill: #a1a1aa;
	}

	.tick.tick-0 line {
		stroke-dasharray: 0;
		stroke: #52525b;
	}
</style>
