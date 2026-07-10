import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// A퇴고 round = one applied merge. Persisted so the writer can review and revert
// across sessions. Phase 5.
export type Round = {
  readonly id: string
  readonly at: number
  readonly presets: readonly string[]
  readonly instruction: string
  readonly before: string
  readonly after: string
}

type State = {
  rounds: Round[]
  add: (round: Omit<Round, 'id' | 'at'>) => void
  clear: () => void
}

const MAX_ROUNDS = 30

export const useRoundsStore = create<State>()(
  persist(
    (set) => ({
      rounds: [],
      add: (round) =>
        set((s) => ({
          // Newest first; cap history.
          rounds: [{ ...round, id: `r${Date.now()}`, at: Date.now() }, ...s.rounds].slice(0, MAX_ROUNDS),
        })),
      clear: () => set({ rounds: [] }),
    }),
    { name: 'frontgem-rounds', partialize: (s) => ({ rounds: s.rounds }) },
  ),
)
