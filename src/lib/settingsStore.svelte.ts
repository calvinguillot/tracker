import { supabase } from '$lib/supabaseClient';

export const PALETTE = [
	{ name: 'Zinc', class: 'bg-zinc-500', hex: '#71717a' },
	{ name: 'Red', class: 'bg-red-600', hex: '#dc2626' },
	{ name: 'Orange', class: 'bg-orange-600', hex: '#ea580c' },
	{ name: 'Amber', class: 'bg-amber-500', hex: '#f59e0b' },
	{ name: 'Green', class: 'bg-green-600', hex: '#16a34a' },
	{ name: 'Emerald', class: 'bg-emerald-500', hex: '#10b981' },
	{ name: 'Teal', class: 'bg-teal-500', hex: '#14b8a6' },
	{ name: 'Cyan', class: 'bg-cyan-500', hex: '#06b6d4' },
	{ name: 'Blue', class: 'bg-blue-600', hex: '#2563eb' },
	{ name: 'Indigo', class: 'bg-indigo-600', hex: '#4f46e5' },
	{ name: 'Violet', class: 'bg-violet-600', hex: '#7c3aed' },
	{ name: 'Purple', class: 'bg-purple-600', hex: '#9333ea' },
	{ name: 'Fuchsia', class: 'bg-fuchsia-600', hex: '#c026d3' },
	{ name: 'Pink', class: 'bg-pink-600', hex: '#db2777' },
	{ name: 'Rose', class: 'bg-rose-600', hex: '#e11d48' }
];

export type SettingItem = {
	id: number | string;
	label?: string;
	color?: string; // CSS class or hex
};

export type GlobalSettings = {
	id?: number;
	calls_types: SettingItem[]; // Art Call Types
	project_types: SettingItem[]; // Project Types
	task_types: SettingItem[]; // Task Types
	notes_types: SettingItem[]; // Note Colors (mostly just colors)
	global_types: { accent: string }; // Global Accent
};

// Default Settings
const defaultSettings: GlobalSettings = {
	calls_types: [
		{ id: 1, label: 'Open Call' },
		{ id: 2, label: 'Residency' },
		{ id: 3, label: 'Grant' },
		{ id: 4, label: 'Job Offer' },
		{ id: 5, label: 'Other' }
	],
	project_types: [],
	task_types: [
		{ id: '1', label: 'Design', color: 'bg-purple-600' },
		{ id: '2', label: 'Dev', color: 'bg-indigo-600' },
		{ id: '3', label: 'Admin', color: 'bg-zinc-500' }
	],
	notes_types: PALETTE.map((p, i) => ({ id: i, color: p.hex })),
	global_types: { accent: 'bg-indigo-600' }
};

class SettingsStore {
	settings = $state<GlobalSettings>(defaultSettings);
	isLoading = $state(true);

	constructor() { }

	async init() {
		this.isLoading = true;
		const { data, error } = await supabase
			.from('globalSettings')
			.select('*')
			.limit(1)
			.single();

		if (data) {
			// Merge with defaults to ensure structure
			this.settings = {
				id: data.id,
				calls_types: data.calls_types || defaultSettings.calls_types,
				project_types: data.project_types || defaultSettings.project_types,
				task_types: data.task_types || defaultSettings.task_types,
				notes_types: data.notes_types || defaultSettings.notes_types,
				global_types: data.global_types || defaultSettings.global_types
			};
		} else if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
			console.error('Error fetching settings:', error);
		} else {
			// No settings found, create default row
			this.saveSettings();
		}

		this.isLoading = false;
	}

	async saveSettings() {
		const payload = {
			calls_types: this.settings.calls_types,
			project_types: this.settings.project_types,
			task_types: this.settings.task_types,
			notes_types: this.settings.notes_types,
			global_types: this.settings.global_types
		};

		if (this.settings.id) {
			const { error } = await supabase
				.from('globalSettings')
				.update(payload)
				.eq('id', this.settings.id);
			if (error) console.error('Error updating settings:', error);
		} else {
			const { data, error } = await supabase
				.from('globalSettings')
				.insert(payload)
				.select()
				.single();
			if (error) console.error('Error creating settings:', error);
			else if (data) this.settings.id = data.id;
		}
	}

	getCallTypeLabel(id: number | null) {
		if (!id) return 'Unknown';
		return this.settings.calls_types.find(t => t.id == id)?.label || 'Unknown';
	}

	getProjectType(id: number | null) {
		if (id === null) return undefined;
		return this.settings.project_types.find(t => t.id == id);
	}

	getTaskType(id: string | null) {
		if (!id) return undefined;
		// Task types stored as strings in local state usually, but let's handle loose typing
		return this.settings.task_types.find(t => t.id == id);
	}
}

export const settings = new SettingsStore();
