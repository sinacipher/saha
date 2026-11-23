import AdminChatViewer from "./AdminChatViewer"

export default function AdminChatsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">نمایش همه گفت‌وگوها</h2>
        <p className="mt-1 text-sm text-muted-foreground">خواندن فقط؛ مدیر می‌تواند همه مکالمات مشاور و دانش‌آموز یا والد را مشاهده کند.</p>
      </div>
      <AdminChatViewer />
    </div>
  )
}
