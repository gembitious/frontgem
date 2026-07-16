// Separator between the rewritten body and the model's editorial note in a
// single streamed response. Shared by the revise prompt (server) and the
// response splitter (client store) so they can never drift apart.
export const NOTE_MARKER = '===LAPIDARY_NOTE==='

/** Split a raw model response into { body, note }. Marker absent → note is null. */
export function splitNote(raw: string): { body: string; note: string | null } {
  const idx = raw.indexOf(NOTE_MARKER)
  if (idx < 0) return { body: raw, note: null }
  return {
    body: raw.slice(0, idx).trimEnd(),
    note: raw.slice(idx + NOTE_MARKER.length).trim() || null,
  }
}
