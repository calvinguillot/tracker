<script>
	import { getContext } from 'svelte';

	const { data, xGet, yGet, yScale } = getContext('LayerCake');

	let { stroke = '#ab00d6', yAccessorKey = null, smoothing = 0, strokeDasharray = 'none' } = $props();

	let points = $derived(
		$data
			.filter((d) => (yAccessorKey ? d[yAccessorKey] != null : true))
			.map((d) => ({
				x: $xGet(d),
				y: yAccessorKey ? $yScale(d[yAccessorKey]) : $yGet(d)
			}))
	);

	let linePath = $derived.by(() => {
		if (points.length < 2) return '';
		if (smoothing <= 0) {
			return 'M' + points.map((p) => `${p.x},${p.y}`).join('L');
		}
		const t = smoothing / 3;
		let d = `M${points[0].x},${points[0].y}`;
		for (let i = 0; i < points.length - 1; i++) {
			const p0 = points[Math.max(0, i - 1)];
			const p1 = points[i];
			const p2 = points[i + 1];
			const p3 = points[Math.min(points.length - 1, i + 2)];
			const cp1x = p1.x + (p2.x - p0.x) * t;
			const cp1y = p1.y + (p2.y - p0.y) * t;
			const cp2x = p2.x - (p3.x - p1.x) * t;
			const cp2y = p2.y - (p3.y - p1.y) * t;
			d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
		}
		return d;
	});

	let areaPath = $derived.by(() => {
		if (points.length < 2) return '';
		const yBottom = $yScale.range()[0];
		const closePath = `L${points[points.length - 1].x},${yBottom}L${points[0].x},${yBottom}Z`;
		if (smoothing <= 0) {
			return 'M' + points.map((p) => `${p.x},${p.y}`).join('L') + closePath;
		}
		const t = smoothing / 3;
		let d = `M${points[0].x},${points[0].y}`;
		for (let i = 0; i < points.length - 1; i++) {
			const p0 = points[Math.max(0, i - 1)];
			const p1 = points[i];
			const p2 = points[i + 1];
			const p3 = points[Math.min(points.length - 1, i + 2)];
			const cp1x = p1.x + (p2.x - p0.x) * t;
			const cp1y = p1.y + (p2.y - p0.y) * t;
			const cp2x = p2.x - (p3.x - p1.x) * t;
			const cp2y = p2.y - (p3.y - p1.y) * t;
			d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
		}
		return d + closePath;
	});

	let gradientId = $derived(`grad-${yAccessorKey || 'default'}-${stroke.replace('#', '')}`);
</script>

<defs>
	<linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
		<stop offset="0%" stop-color={stroke} stop-opacity="0.25" />
		<stop offset="35%" stop-color={stroke} stop-opacity="0" />
	</linearGradient>
</defs>

<path d={areaPath} fill="url(#{gradientId})" />
<path class="path-line" d={linePath} {stroke} stroke-dasharray={strokeDasharray}></path>

<style>
	.path-line {
		fill: none;
		stroke-linejoin: round;
		stroke-linecap: round;
		stroke-width: 2;
	}
</style>
