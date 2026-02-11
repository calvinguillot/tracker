import { supabase } from '$lib/supabaseClient';

class DataStore {
    tasks = $state<any[]>([]);
    dailyTracking = $state<any[]>([]);
    projects = $state<any[]>([]);
    notes = $state<any[]>([]);
    artCalls = $state<any[]>([]);
    
    isLoading = $state(true);
    isInitialized = $state(false);
    private initPromise: Promise<void> | null = null;

    constructor() { }

    reset() {
        this.tasks = [];
        this.dailyTracking = [];
        this.projects = [];
        this.notes = [];
        this.artCalls = [];
        this.isLoading = true;
        this.isInitialized = false;
        this.initPromise = null;
    }

    async init() {
        if (this.isInitialized) return;
        
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._doInit();
        try {
            await this.initPromise;
        } finally {
            this.initPromise = null;
        }
    }

    private async _doInit() {
        this.isLoading = true;
        
        const [
            { data: tasksData, error: tasksError },
            { data: dailyData, error: dailyError },
            { data: projectsData, error: projectsError },
            { data: notesData, error: notesError },
            { data: artCallsData, error: artCallsError }
        ] = await Promise.all([
            supabase.from('tasks').select('*').order('deadline_at', { ascending: true }),
            supabase.from('dailyTracking').select('*').order('created_at', { ascending: false }),
            supabase.from('projects').select('*').order('created_at', { ascending: false }),
            supabase.from('notes').select('*').order('created_at', { ascending: false }),
            supabase.from('artCalls').select('*').order('deadline', { ascending: true })
        ]);

        if (tasksData) this.tasks = tasksData;
        if (tasksError) console.error('Error fetching tasks:', tasksError);

        if (dailyData) this.dailyTracking = dailyData;
        if (dailyError) console.error('Error fetching dailyTracking:', dailyError);

        if (projectsData) this.projects = projectsData;
        if (projectsError) console.error('Error fetching projects:', projectsError);

        if (notesData) this.notes = notesData;
        if (notesError) console.error('Error fetching notes:', notesError);

        if (artCallsData) this.artCalls = artCallsData;
        if (artCallsError) console.error('Error fetching artCalls:', artCallsError);

        this.isLoading = false;
        this.isInitialized = true;
    }

    // TASKS Methods
    addTask(task: any) {
        this.tasks.push(task);
        this.tasks.sort((a, b) => {
            const dateA = a.deadline_at ? new Date(a.deadline_at).getTime() : Infinity;
            const dateB = b.deadline_at ? new Date(b.deadline_at).getTime() : Infinity;
            return dateA - dateB;
        });
    }

    updateTask(updatedTask: any) {
        const index = this.tasks.findIndex(t => t.id === updatedTask.id);
        if (index !== -1) {
            this.tasks[index] = updatedTask;
            // Re-sort might be needed if deadline changed, but maybe overkill for every update
            // Let's re-sort only if date changed? For now, simpler to just let it be or trigger sort
        }
    }

    deleteTask(id: number) {
        this.tasks = this.tasks.filter(t => t.id !== id);
    }

    // DAILY TRACKING Methods
    addDailyEntry(entry: any) {
        this.dailyTracking = [entry, ...this.dailyTracking];
        // Already sorted by created_at desc since we prepend
    }

    updateDailyEntry(updatedEntry: any) {
        const index = this.dailyTracking.findIndex(e => e.id === updatedEntry.id);
        if (index !== -1) {
            this.dailyTracking[index] = updatedEntry;
        }
    }

    deleteDailyEntry(id: number) {
        this.dailyTracking = this.dailyTracking.filter(e => e.id !== id);
    }

    // PROJECTS Methods
    addProject(project: any) {
        this.projects = [project, ...this.projects];
    }

    updateProject(updatedProject: any) {
        const index = this.projects.findIndex(p => p.id === updatedProject.id);
        if (index !== -1) {
            this.projects[index] = updatedProject;
        }
    }

    deleteProject(id: number) {
        this.projects = this.projects.filter(p => p.id !== id);
    }

    // NOTES Methods
    addNote(note: any) {
        this.notes = [note, ...this.notes];
    }

    updateNote(updatedNote: any) {
        const index = this.notes.findIndex(n => n.id === updatedNote.id);
        if (index !== -1) {
            this.notes[index] = updatedNote;
        }
    }

    deleteNote(id: number) {
        this.notes = this.notes.filter(n => n.id !== id);
    }

    // ART CALLS Methods
    addArtCall(artCall: any) {
        this.artCalls.push(artCall);
        this.artCalls.sort((a, b) => {
            const dateA = new Date(a.deadline).getTime();
            const dateB = new Date(b.deadline).getTime();
            return dateA - dateB;
        });
    }

    updateArtCall(updatedArtCall: any) {
        const index = this.artCalls.findIndex(a => a.id === updatedArtCall.id);
        if (index !== -1) {
            this.artCalls[index] = updatedArtCall;
        }
    }

    deleteArtCall(id: number) {
        this.artCalls = this.artCalls.filter(a => a.id !== id);
    }
}

export const dataStore = new DataStore();
