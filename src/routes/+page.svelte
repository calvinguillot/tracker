<script>
	let { data } = $props();
</script>

<ul>
	{#each data.dailyTracking as dailyTracking}
		<li>{dailyTracking.mood}</li>
	{/each}
</ul>
