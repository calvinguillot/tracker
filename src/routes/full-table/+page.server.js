import { supabase } from '$lib/supabaseClient';

export async function load() {
	const { data } = await supabase.from('dailyTracking').select().order('created_at', { ascending: false });
	return {
		dailyTracking: data ?? []
	};
}

