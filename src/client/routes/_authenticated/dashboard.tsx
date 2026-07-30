import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { authClient } from '../../lib/auth-client'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card'
import { useState } from 'react'

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { session } = Route.useRouteContext()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    try {
      await authClient.signOut()
      navigate({ to: '/login' })
    } catch (err) {
      console.error('Failed to sign out:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
          <CardDescription>Details of the currently logged in user</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 py-2 border-b border-border">
            <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">Name</span>
            <span className="col-span-2 text-sm">{session?.user?.name || 'N/A'}</span>
          </div>
          <div className="grid grid-cols-3 py-2 border-b border-border">
            <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">Email</span>
            <span className="col-span-2 text-sm">{session?.user?.email || 'N/A'}</span>
          </div>
          <div className="grid grid-cols-3 py-2">
            <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">User ID</span>
            <span className="col-span-2 text-xs font-mono break-all">{session?.user?.id || 'N/A'}</span>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end pt-6">
          <Button variant="destructive" onClick={handleSignOut} disabled={loading}>
            {loading ? 'Signing Out...' : 'Sign Out'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
