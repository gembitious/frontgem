import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useSyncExternalStore } from 'react'

// Draft state lives client-side and autosaves to localStorage (zustand persist).
// Tags are a comma-separated string in the form; parsed to an array at publish.
type Fields = {
  title: string
  description: string
  slug: string
  date: string
  tags: string
  draft: boolean
  body: string
}

type Actions = {
  set: <K extends keyof Fields>(key: K, value: Fields[K]) => void
  reset: () => void
}

const initial: Fields = {
  title: '',
  description: '',
  slug: '',
  date: '',
  tags: '',
  draft: false,
  body: '',
}

export const useEditorStore = create<Fields & Actions>()(
  persist(
    (set) => ({
      ...initial,
      set: (key, value) => set({ [key]: value } as Partial<Fields>),
      reset: () => set(initial),
    }),
    {
      name: 'frontgem-draft',
      partialize: ({ title, description, slug, date, tags, draft, body }) => ({
        title,
        description,
        slug,
        date,
        tags,
        draft,
        body,
      }),
    },
  ),
)

/** True once persisted state has been read from localStorage. Prevents rendering
 *  persisted values during SSR/first paint (which would cause a hydration mismatch). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => useEditorStore.persist.onFinishHydration(cb),
    () => useEditorStore.persist.hasHydrated(),
    () => false,
  )
}

export function parseTags(input: string): string[] {
  return input
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}
