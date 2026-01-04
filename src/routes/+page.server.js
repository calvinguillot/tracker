import { supabase } from '$lib/supabaseClient';

export async function load() {
	const { data } = await supabase.from('dailyTracking').select();
	console.log(data);
	return {
		dailyTracking: data ?? []
	};
}
