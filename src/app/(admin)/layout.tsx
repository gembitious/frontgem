// Wider canvas for the editor's two-pane (form + live preview) layout.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
}
