import { supabase } from '$lib/supabaseClient';

export async function load() {
	// We'll load the data on the client side to allow instant navigation
	return {
		dailyTracking: []
	};
}
