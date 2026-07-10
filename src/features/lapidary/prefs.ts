import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_MODEL, type ModelId } from './models'

// Persisted 퇴고 preferences (model choice survives sessions).
type State = {
  model: ModelId
  setModel: (model: ModelId) => void
}

export const useLapidaryPrefs = create<State>()(
  persist(
    (set) => ({
      model: DEFAULT_MODEL,
      setModel: (model) => set({ model }),
    }),
    { name: 'frontgem-lapidary-prefs' },
  ),
)
