import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

function AboutPage() {
  return (
    <div>
      <h2 className="font-heading text-2xl font-bold mb-4">About</h2>
      <p className="text-muted-foreground">
        Payment Gateway — N-Layer Architecture Scaffold
      </p>
    </div>
  )
}
