import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function DesignTestPage() {
  return (
    <div className="p-8 space-y-6 bg-background min-h-screen">
      <h1 className="text-2xl font-bold">Design System Smoke Test</h1>
      <div className="flex gap-2 flex-wrap">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="success">Success</Button>
        <Button isLoading>Loading</Button>
        <Button disabled>Disabled</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Default Card</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Shadow + border + radius.</CardContent>
        </Card>
        <Card variant="elevated">
          <CardHeader><CardTitle>Elevated Card</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">No border, larger shadow.</CardContent>
        </Card>
        <Card variant="sunken">
          <CardHeader><CardTitle>Sunken Card</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Muted surface.</CardContent>
        </Card>
        <Card variant="interactive">
          <CardHeader><CardTitle>Interactive Card</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">Hover me.</CardContent>
        </Card>
      </div>
      <div className="max-w-md space-y-4">
        <Input label="نام" placeholder="متن فارسی" />
        <Input label="کد ملی" dir="ltr" className="text-left" placeholder="0012345678" />
        <Input label="با خطا" error="این فیلد الزامی است" />
        <Input label="با راهنما" hint="حداقل ۸ کاراکتر" />
      </div>
    </div>
  )
}