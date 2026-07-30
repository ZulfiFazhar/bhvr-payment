import { createFileRoute, redirect } from '@tanstack/react-router'
import { authClient } from '../../lib/auth-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { useEffect, useState } from 'react'

interface Transaction {
  id: string
  userId: string
  amount: number
  status: string
  createdAt: string
  updatedAt: string
  userName: string
  userEmail: string
}

interface AdminData {
  transactions: Transaction[]
  totalBalance: number
}

export const Route = createFileRoute('/_authenticated/admin')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession()
    if (!session || (session.user as any).role !== 'admin') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: AdminPage,
})

function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      const res = await fetch('/api/topups/admin/transactions')
      if (!res.ok) {
        throw new Error('Failed to fetch transactions')
      }
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      } else {
        throw new Error(json.error || 'Failed to fetch')
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val)
  }

  if (loading) {
    return <div className="text-center py-8">Loading admin panel...</div>
  }

  if (error) {
    return <div className="text-center text-destructive py-8">{error}</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Total Saldo Masuk</CardTitle>
          <CardDescription>Sum of completed topups in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">
            {formatIDR(data?.totalBalance || 0)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>System-wide transactions history</CardDescription>
        </CardHeader>
        <CardContent>
          {data?.transactions && data.transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 px-3 font-semibold text-muted-foreground uppercase tracking-wider">User Name</th>
                    <th className="py-2 px-3 font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                    <th className="py-2 px-3 font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="py-2 px-3 font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                    <th className="py-2 px-3 font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-muted/50">
                      <td className="py-2 px-3 font-medium">{t.userName}</td>
                      <td className="py-2 px-3 font-mono">{t.userEmail}</td>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">No transactions found</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
