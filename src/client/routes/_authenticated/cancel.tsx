import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card'
import { XCircle } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/cancel')({
  component: CancelPage,
})

function CancelPage() {
  return (
    <div className="max-w-md mx-auto mt-10">
      <Card className="text-center">
        <CardHeader className="flex flex-col items-center justify-center space-y-4">
          <div className="rounded-full bg-destructive/10 p-3">
            <XCircle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">Top Up Canceled</CardTitle>
          <CardDescription>
            Your payment request has been canceled or could not be completed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No funds have been deducted from your account. You can attempt the topup again from the dashboard.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center pt-6">
          <Button asChild className="w-full">
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
