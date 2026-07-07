const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

/** ISO date string → "2026년 7월 7일". */
export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso))
}
