<script>
	import { getContext } from 'svelte';

	const { data, xGet, yGet, yScale } = getContext('LayerCake');

	let { stroke = '#ab00d6', yAccessorKey = null } = $props();

	let path = $derived(
		'M' +
			$data
				.filter((d) => (yAccessorKey ? d[yAccessorKey] != null : true))
				.map((d) => {
					const x = $xGet(d);
					const y = yAccessorKey ? $yScale(d[yAccessorKey]) : $yGet(d);
					return x + ',' + y;
				})
				.join('L')
	);
</script>

<path class="path-line" d={path} {stroke}></path>

<style>
	.path-line {
		fill: none;
		stroke-linejoin: round;
		stroke-linecap: round;
		stroke-width: 2;
	}
</style>
