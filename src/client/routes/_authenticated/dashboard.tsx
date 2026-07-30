import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { authClient } from '../../lib/auth-client'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { useState, useEffect } from 'react'

interface TopupTransaction {
  id: string
  userId: string
  amount: number
  paymentId: string
  paymentUrl: string
  status: string
  createdAt: string
  updatedAt: string
}

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { session } = Route.useRouteContext()
  const { data: sessionData, refetch: refetchSession } = authClient.useSession()
  const currentSession = sessionData || session
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [topupAmount, setTopupAmount] = useState('')
  const [topupLoading, setTopupLoading] = useState(false)
  const [topupError, setTopupError] = useState<string | null>(null)
  const [topupSuccess, setTopupSuccess] = useState<string | null>(null)

  const [history, setHistory] = useState<TopupTransaction[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

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

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/topups/history')
      if (!res.ok) {
        throw new Error('Failed to fetch history')
      }
      const json = await res.json()
      if (json.success) {
        setHistory(json.data)
      }
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTopupLoading(true)
    setTopupError(null)
    setTopupSuccess(null)

    const amountNum = Number(topupAmount)
    if (isNaN(amountNum) || amountNum < 10000) {
      setTopupError('Minimum topup amount is Rp10.000')
      setTopupLoading(false)
      return
    }

    try {
      const res = await fetch('/api/topups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: amountNum }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to request topup')
      }

      setTopupSuccess('Topup requested successfully! Open the payment link to proceed.')
      setTopupAmount('')
      fetchHistory()
      // Open payment URL in a new tab automatically
      if (json.data?.paymentUrl) {
        window.open(json.data.paymentUrl, '_blank')
      }
    } catch (err: any) {
      setTopupError(err.message || 'Something went wrong')
    } finally {
      setTopupLoading(false)
    }
  }

  const handleSimulatePayment = async (id: string) => {
    try {
      const res = await fetch(`/api/topups/${id}/simulate-pay`, {
        method: 'POST',
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to simulate payment')
      }
      // Refresh both session and history
      refetchSession()
      fetchHistory()
    } catch (err) {
      console.error('Failed to simulate payment:', err)
    }
  }

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val)
  }

  const balance = (currentSession?.user as any)?.balance ?? 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Wallet Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle>Wallet Balance</CardTitle>
          <CardDescription>Your current available balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">
            {formatIDR(balance)}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Topup Form */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Top Up Wallet</CardTitle>
            <CardDescription>Request a new payment</CardDescription>
          </CardHeader>
          <form onSubmit={handleTopupSubmit}>
            <CardContent className="space-y-4">
              {topupError && (
                <div className="bg-destructive/10 text-destructive text-xs p-3 font-semibold">
                  {topupError}
                </div>
              )}
              {topupSuccess && (
                <div className="bg-green-500/10 text-green-500 text-xs p-3 font-semibold">
                  {topupSuccess}
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="amount">Amount (IDR)</Label>
                <Input
                  id="amount"
                  type="number"
                  required
                  min={10000}
                  placeholder="Min 10000"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  disabled={topupLoading}
                />
              </div>
            </CardContent>
            <CardFooter className="pt-4">
              <Button type="submit" className="w-full" disabled={topupLoading}>
                {topupLoading ? 'Processing...' : 'Pay with QRIS'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* User Profile Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>User Profile</CardTitle>
            <CardDescription>Details of the currently logged in user</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 py-2 border-b border-border">
              <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">Name</span>
              <span className="col-span-2 text-sm">{currentSession?.user?.name || 'N/A'}</span>
            </div>
            <div className="grid grid-cols-3 py-2 border-b border-border">
              <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">Email</span>
              <span className="col-span-2 text-sm">{currentSession?.user?.email || 'N/A'}</span>
            </div>
            <div className="grid grid-cols-3 py-2 border-b border-border">
              <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">Role</span>
              <span className="col-span-2 text-sm capitalize">{(currentSession?.user as any)?.role || 'user'}</span>
            </div>
            <div className="grid grid-cols-3 py-2">
              <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">User ID</span>
              <span className="col-span-2 text-xs font-mono break-all">{currentSession?.user?.id || 'N/A'}</span>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end pt-6">
            <Button variant="destructive" onClick={handleSignOut} disabled={loading}>
              {loading ? 'Signing Out...' : 'Sign Out'}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Topup History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Up History</CardTitle>
          <CardDescription>Your previous top up attempts and transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading history...</div>
          ) : history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 px-3 font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="py-2 px-3 font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                    <th className="py-2 px-3 font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="py-2 px-3 font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.map((t) => (
                    <tr key={t.id} className="hover:bg-muted/50">
                      <td className="py-2 px-3 text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</td>
                      <td className="py-2 px-3 font-semibold">{formatIDR(t.amount)}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          t.status === 'completed'
                            ? 'bg-green-500/10 text-green-500'
                            : t.status === 'failed'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-yellow-500/10 text-yellow-500'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(t.paymentUrl, '_blank')}
                        >
                          Payment Link
                        </Button>
                        {t.status === 'pending' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleSimulatePayment(t.id)}
                          >
                            Simulate Success
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">No transaction history found</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
