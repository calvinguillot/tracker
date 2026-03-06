<script lang="ts">
	import { scaleTime, scaleBand } from 'd3-scale';
	import { timeFormat } from 'd3-time-format';

	/** Scatter point: date + event key */
	type ScatterPoint = { date: Date; eventKey: string };

	let {
		points = [] as ScatterPoint[],
		eventOrder = [] as string[],
		eventColors = {} as Record<string, string>,
		eventLabels = {} as Record<string, string>,
		width = 280,
		height = 220,
		padding = { top: 24, right: 12, bottom: 32, left: 56 },
		pointRadius = 3
	} = $props();

	const formatDate = timeFormat('%b %d');

	function startOfDay(d: Date): Date {
		return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
	}

	// Domain: first day at left edge, last day at right edge (days span full width)
	let xScale = $derived.by(() => {
		if (points.length === 0) {
			const now = new Date();
			const weekAgo = new Date(now);
			weekAgo.setDate(weekAgo.getDate() - 7);
			return scaleTime().domain([weekAgo, now]).range([padding.left, width - padding.right]);
		}
		const minT = Math.min(...points.map((p) => p.date.getTime()));
		const maxT = Math.max(...points.map((p) => p.date.getTime()));
		const domainStart = startOfDay(new Date(minT));
		const domainEnd = startOfDay(new Date(maxT));
		// Single day: use [day, day+1] so it spans full width
		const end =
			domainStart.getTime() === domainEnd.getTime()
				? new Date(domainEnd.getTime() + 86400000)
				: domainEnd;
		return scaleTime()
			.domain([domainStart, end])
			.range([padding.left, width - padding.right]);
	});

	let yScale = $derived(
		scaleBand()
			.domain(eventOrder)
			.range([padding.top, height - padding.bottom])
			.padding(0.25)
	);

	let bandWidth = $derived(yScale.bandwidth() ?? 0);

	// Grid lines and ticks at day boundaries. This month: every day if ≤15 days, else every other. All time: every 15 days.
	let xTicks = $derived.by(() => {
		if (points.length === 0) return [];
		const minT = Math.min(...points.map((p) => p.date.getTime()));
		const maxT = Math.max(...points.map((p) => p.date.getTime()));
		const startDay = startOfDay(new Date(minT));
		const endDay = startOfDay(new Date(maxT));
		const daysSpan = Math.ceil((endDay.getTime() - startDay.getTime()) / 86400000) + 1;
		const interval = daysSpan <= 31 ? (daysSpan <= 15 ? 1 : 2) : 15;

		const ticks: Date[] = [];
		let d = new Date(startDay);
		while (d.getTime() <= endDay.getTime()) {
			ticks.push(new Date(d));
			d.setDate(d.getDate() + interval);
		}
		return ticks;
	});
</script>

<svg
	viewBox="0 0 {width} {height}"
	class="h-full w-full"
	preserveAspectRatio="xMidYMid meet"
>
	<!-- Grid lines (vertical for days) -->
	{#each xTicks as tick}
		<line
			x1={xScale(tick)}
			x2={xScale(tick)}
			y1={padding.top}
			y2={height - padding.bottom}
			stroke="#3f3f46"
			stroke-dasharray="2"
		/>
	{/each}

	<!-- X axis labels (days) -->
	{#each xTicks as tick}
		<text
			x={xScale(tick)}
			y={height - 8}
			text-anchor="middle"
			class="fill-zinc-400 text-[8px] font-medium"
		>
			{formatDate(tick)}
		</text>
	{/each}

	<!-- Y axis labels (events) -->
	{#each eventOrder as eventKey}
		{@const y = (yScale(eventKey) ?? 0) + bandWidth / 2}
		<text
			x={padding.left - 6}
			y={y}
			text-anchor="end"
			dominant-baseline="middle"
			class="fill-zinc-400 text-[8px] font-medium"
		>
			{eventLabels[eventKey] ?? eventKey}
		</text>
	{/each}

	<!-- Scatter points (use startOfDay so they align with grid lines) -->
	{#each points as point}
		{@const x = xScale(startOfDay(point.date))}
		{@const y = (yScale(point.eventKey) ?? 0) + bandWidth / 2}
		{@const color = eventColors[point.eventKey] ?? '#71717a'}
		<circle
			cx={x}
			cy={y}
			r={pointRadius}
			fill={color}
			stroke="#18181b"
			stroke-width="1"
		/>
	{/each}
</svg>
