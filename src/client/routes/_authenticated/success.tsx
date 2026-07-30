import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card'
import { CheckCircle2 } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/success')({
  component: SuccessPage,
})

function SuccessPage() {
  return (
    <div className="max-w-md mx-auto mt-10">
      <Card className="text-center">
        <CardHeader className="flex flex-col items-center justify-center space-y-4">
          <div className="rounded-full bg-green-500/10 p-3">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold">Top Up Successful!</CardTitle>
          <CardDescription>
            Your payment has been completed and your wallet balance will update shortly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Thank you for using our payment gateway. You can now verify your updated balance on the dashboard.
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
