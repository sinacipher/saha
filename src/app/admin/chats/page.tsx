import AdminChatViewer from "./AdminChatViewer"

export default function AdminChatsPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold md:text-3xl">مرکز گفتگوها</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          مشاهده گفتگوهای مشاوران با دانش‌آموزان و والدین. این بخش فقط برای نظارت است.
        </p>
      </header>
      <AdminChatViewer />
    </div>
  )
}
