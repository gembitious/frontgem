import { create } from 'zustand'
import { computeDiff, type Hunk, type HunkStatus } from './diff'
import { splitNote } from './note'

// Hunk state needs fine-grained subscription (each hunk row re-renders on its own
// accept/reject) → zustand with selectors (CLAUDE.md rationale). Ephemeral: no
// persistence, reset on close.
export type LapidaryPhase = 'options' | 'revising' | 'diff'
export type DiffDisplay = 'unified' | 'split'

type State = {
  open: boolean
  phase: LapidaryPhase
  presets: string[]
  instruction: string
  original: string
  revised: string
  /** Model's editorial note (after NOTE_MARKER), shown beside the diff. */
  note: string | null
  hunks: Hunk[]
  display: DiffDisplay
  error: string | null
}

type Actions = {
  begin: (original: string) => void
  close: () => void
  togglePreset: (id: string) => void
  setInstruction: (value: string) => void
  startRevising: () => void
  appendRevised: (text: string) => void
  failRevising: (message: string) => void
  finishRevising: () => void
  setStatus: (id: string, status: HunkStatus) => void
  setEdited: (id: string, text: string) => void
  acceptAll: () => void
  rejectAll: () => void
  setDisplay: (display: DiffDisplay) => void
}

const initial: State = {
  open: false,
  phase: 'options',
  presets: [],
  instruction: '',
  original: '',
  revised: '',
  note: null,
  hunks: [],
  display: 'unified',
  error: null,
}

export const useLapidaryStore = create<State & Actions>((set, get) => ({
  ...initial,

  begin: (original) => set({ ...initial, open: true, phase: 'options', original }),
  close: () => set({ open: false }),

  togglePreset: (id) =>
    set((s) => ({
      presets: s.presets.includes(id) ? s.presets.filter((p) => p !== id) : [...s.presets, id],
    })),
  setInstruction: (value) => set({ instruction: value }),

  startRevising: () => set({ phase: 'revising', revised: '', note: null, error: null, hunks: [] }),
  appendRevised: (text) => set((s) => ({ revised: s.revised + text })),
  failRevising: (message) => set({ error: message, phase: 'options' }),
  finishRevising: () => {
    const { original, revised } = get()
    // The response is "rewritten body + NOTE_MARKER + editorial note" — only the
    // body participates in the diff; the note is displayed alongside it.
    const { body, note } = splitNote(revised)
    set({ hunks: computeDiff(original, body), note, phase: 'diff' })
  },

  setStatus: (id, status) =>
    set((s) => ({ hunks: s.hunks.map((h) => (h.id === id ? { ...h, status, edited: null } : h)) })),
  setEdited: (id, text) =>
    set((s) => ({
      hunks: s.hunks.map((h) => (h.id === id ? { ...h, status: 'edited', edited: text } : h)),
    })),
  acceptAll: () =>
    set((s) => ({
      hunks: s.hunks.map((h) => (h.kind === 'equal' ? h : { ...h, status: 'accepted', edited: null })),
    })),
  rejectAll: () =>
    set((s) => ({
      hunks: s.hunks.map((h) => (h.kind === 'equal' ? h : { ...h, status: 'rejected', edited: null })),
    })),
  setDisplay: (display) => set({ display }),
}))
