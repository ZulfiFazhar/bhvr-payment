import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div>
      <h2 className="font-heading text-2xl font-bold mb-4">Dashboard</h2>
      <p className="text-muted-foreground">Payment Gateway is running.</p>
    </div>
  )
}
