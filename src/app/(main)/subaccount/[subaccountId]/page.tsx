import BlurPage from '@/components/global/blur-page'
import CircleProgress from '@/components/global/circle-progress'
import SubaccountFunnelChart from '@/components/global/subaccount-funnel-chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { db } from '@/lib/db'
import { stripe } from '@/lib/stripe'
import { AreaChart } from '@tremor/react'
import { Contact2, DollarSign, IndianRupee, ShoppingCart } from 'lucide-react'
import React from 'react'

type Props = {
  params: { subaccountId: string }
}

const SubaccountPageId = async ({ params }: Props) => {
  let currency = 'INR'
  let sessions
  let totalClosedSessions
  let totalPendingSessions
  let net = 0
  let potentialIncome = 0
  let closingRate = 0

  const subaccountDetails = await db.subAccount.findUnique({
    where: { id: params.subaccountId },
  })

  const currentYear = new Date().getFullYear()
  const startDate = new Date(`${currentYear}-01-01T00:00:00Z`).getTime() / 1000
  const endDate = new Date(`${currentYear}-12-31T23:59:59Z`).getTime() / 1000

  if (!subaccountDetails) return

  if (subaccountDetails.connectAccountId) {
    const response = await stripe.accounts.retrieve({
      stripeAccount: subaccountDetails.connectAccountId,
    })
    currency = response.default_currency?.toUpperCase() || 'INR'
    const checkoutSessions = await stripe.checkout.sessions.list(
      { created: { gte: startDate, lte: endDate }, limit: 100 },
      { stripeAccount: subaccountDetails.connectAccountId }
    )
    sessions = checkoutSessions.data.map((session) => ({
      ...session,
      created: new Date(session.created).toLocaleDateString(),
      amount_total: session.amount_total ? session.amount_total / 100 : 0,
    }))

    totalClosedSessions = checkoutSessions.data.filter((session) => session.status === 'complete')
    totalPendingSessions = checkoutSessions.data.filter((session) => session.status === 'open' || session.status === 'expired')

    net = +totalClosedSessions.reduce((total, session) => total + (session.amount_total || 0), 0).toFixed(2)
    potentialIncome = +totalPendingSessions.reduce((total, session) => total + (session.amount_total || 0), 0).toFixed(2)
    closingRate = +((totalClosedSessions.length / checkoutSessions.data.length) * 100).toFixed(2)
  }

  const funnels = await db.funnel.findMany({
    where: { subAccountId: params.subaccountId },
    include: { FunnelPages: true },
  })

  const funnelPerformanceMetrics = funnels.map((funnel) => ({
    ...funnel,
    totalFunnelVisits: funnel.FunnelPages.reduce((total, page) => total + page.visits, 0),
  }))

  return (
    <BlurPage>
      <div className="relative h-full flex flex-col gap-6">
        <div className="flex gap-4 flex-col xl:flex-row">
          <Card className="flex-1 relative">
            <CardHeader>
              <CardDescription>Income</CardDescription>
              <CardTitle className="text-4xl">{net ? `${currency} ${net.toFixed(2)}` : `₹0.00`}</CardTitle>
              <small className="text-xs text-muted-foreground">For the year {currentYear}</small>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Total revenue generated as reflected in your stripe dashboard.</CardContent>
            <IndianRupee className="absolute right-4 top-4 text-muted-foreground" />
          </Card>
          <Card className="flex-1 relative">
            <CardHeader>
              <CardDescription>Potential Income</CardDescription>
              <CardTitle className="text-4xl">{potentialIncome ? `INR ${potentialIncome.toFixed(2)}` : `₹0.00`}</CardTitle>
              <small className="text-xs text-muted-foreground">For the year {currentYear}</small>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">This is how much you can close.</CardContent>
            <Contact2 className="absolute right-4 top-4 text-muted-foreground" />
          </Card>
          <Card className="xl:w-fit">
            <CardHeader>
              <CardDescription>Conversions</CardDescription>
              <CircleProgress
                value={closingRate}
                description={
                  <>
                    {sessions && (
                      <div className="flex flex-col">Total Carts Opened<div className="flex gap-2"><ShoppingCart className="text-rose-700" />{sessions.length}</div></div>
                    )}
                    {totalClosedSessions && (
                      <div className="flex flex-col">Won Carts<div className="flex gap-2"><ShoppingCart className="text-emerald-700" />{totalClosedSessions.length}</div></div>
                    )}
                  </>
                }
              />
            </CardHeader>
          </Card>
        </div>
        <div className="flex gap-4 flex-col xl:flex-row">
          <Card className="relative">
            <CardHeader>
              <CardDescription>Funnel Performance</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground flex flex-col gap-12 justify-between">
              <SubaccountFunnelChart data={funnelPerformanceMetrics} />
              <div className="lg:w-[150px]">Total page visits across all funnels. Hover over to get more details on funnel page performance.</div>
            </CardContent>
          </Card>
          <Card className="p-4 flex-1">
            <CardHeader>
              <CardTitle>Checkout Activity</CardTitle>
            </CardHeader>
            <AreaChart className="text-sm stroke-primary" data={sessions || []} index="created" categories={['amount_total']} colors={['primary']} yAxisWidth={30} showAnimation={true} />
          </Card>
        </div>
      </div>
    </BlurPage>
  )
}

export default SubaccountPageId
