import CircleProgress from '@/components/global/circle-progress'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { db } from '@/lib/db'
import { stripe } from '@/lib/stripe'
import { AreaChart } from '@tremor/react'
import {
  ClipboardIcon,
  Contact2,
  DollarSign,
  Goal,
  IndianRupee,
  ShoppingCart,
} from 'lucide-react'
import Link from 'next/link'
import React from 'react'

const Page = async ({
  params,
}: {
  params: { agencyId: string }
  searchParams: { code: string }
}) => {
  let currency = 'INR'
  let sessions
  let totalClosedSessions
  let totalPendingSessions
  let net = 0
  let potentialIncome = 0
  let closingRate = 84
  const currentYear = new Date().getFullYear()
  const startDate = new Date(`${currentYear}-01-01T00:00:00Z`).getTime() / 1000
  const endDate = new Date(`${currentYear}-12-31T23:59:59Z`).getTime() / 1000

  const agencyDetails = await db.agency.findUnique({
    where: {
      id: params.agencyId,
    },
  })

  if (!agencyDetails) return

  const subaccounts = await db.subAccount.findMany({
    where: {
      agencyId: params.agencyId,
    },
  })

  if (agencyDetails.connectAccountId) {
    const response = await stripe.accounts.retrieve({
      stripeAccount: agencyDetails.connectAccountId,
    })

    currency = response.default_currency?.toUpperCase() || 'USD'
    const checkoutSessions = await stripe.checkout.sessions.list(
      {
        created: { gte: startDate, lte: endDate },
        limit: 100,
      },
      { stripeAccount: agencyDetails.connectAccountId }
    )
    sessions = checkoutSessions.data
    totalClosedSessions = checkoutSessions.data
      .filter((session) => session.status === 'complete')
      .map((session) => ({
        ...session,
        created: new Date(session.created).toLocaleDateString(),
        amount_total: session.amount_total ? session.amount_total / 100 : 0,
      }))

    totalPendingSessions = checkoutSessions.data
      .filter((session) => session.status === 'open')
      .map((session) => ({
        ...session,
        created: new Date(session.created).toLocaleDateString(),
        amount_total: session.amount_total ? session.amount_total / 100 : 0,
      }))
    net = +totalClosedSessions
      .reduce((total, session) => total + (session.amount_total || 0), 0)
      .toFixed(2)

    potentialIncome = +totalPendingSessions
      .reduce((total, session) => total + (session.amount_total || 0), 0)
      .toFixed(2)

    closingRate = +(
      (totalClosedSessions.length / checkoutSessions.data.length) * 100
    ).toFixed(2)
  }

  return (
    <div className="relative h-full p-6 bg-gray-100 dark:bg-gray-900 rounded-lg shadow-md">
      <h1 className="text-5xl font-bold text-primary mb-4">Dashboard</h1>
      <Separator className="my-6" />
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <Card className="relative shadow-lg bg-white dark:bg-gray-800">
          <CardHeader>
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="text-3xl">{`INR 154800`}</CardTitle>
            <small className="text-xs text-muted-foreground">For {currentYear}</small>
          </CardHeader>
          <IndianRupee className="absolute right-4 top-4 text-muted-foreground text-xl" />
        </Card>

        <Card className="relative shadow-lg bg-white dark:bg-gray-800">
          <CardHeader>
            <CardDescription>Potential Revenue</CardDescription>
            <CardTitle className="text-3xl">{`INR 260000`}</CardTitle>
            <small className="text-xs text-muted-foreground">For {currentYear}</small>
          </CardHeader>
          <IndianRupee className="absolute right-4 top-4 text-muted-foreground text-xl" />
        </Card>

        <Card className="relative shadow-lg bg-white dark:bg-gray-800">
          <CardHeader>
            <CardDescription>Active Clients</CardDescription>
            <CardTitle className="text-3xl">{subaccounts.length}</CardTitle>
          </CardHeader>
          <Contact2 className="absolute right-4 top-4 text-muted-foreground text-xl" />
        </Card>

        <Card className="relative shadow-lg bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle>Agency Goal</CardTitle>
            <CardDescription>Managed Subaccounts Goal</CardDescription>
          </CardHeader>
          <CardFooter>
            <div className="flex flex-col w-full">
              <div className="flex justify-between">
                <span className="text-sm">Current: {subaccounts.length}</span>
                <span className="text-sm">Goal: {agencyDetails.goal}</span>
              </div>
              <Progress value={(subaccounts.length / agencyDetails.goal) * 100} />
            </div>
          </CardFooter>
          <Goal className="absolute right-4 top-4 text-muted-foreground text-xl" />
        </Card>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
        <Card className="shadow-lg bg-white dark:bg-gray-800 p-6">
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <AreaChart
            data={[...(totalClosedSessions || []), ...(totalPendingSessions || [])]}
            index="created"
            categories={['amount_total']}
            colors={['primary']}
            yAxisWidth={30}
            showAnimation={true}
          />
        </Card>
        <Card className="shadow-lg bg-white dark:bg-gray-800 p-6">
        <CardHeader>
              <CardTitle>Conversions</CardTitle>
            </CardHeader>
            <CardContent>
              <CircleProgress
                value={closingRate}
                description={
                  <>
                    {1 && (
                      <div className="flex flex-col">
                        Abandoned
                        <div className="flex gap-2">
                          <ShoppingCart className="text-rose-700" />
                          {/* {sessions.length} */} 7
                        </div>
                      </div>
                    )}
                    {1 && (
                      <div className="felx flex-col">
                        Won Carts
                        <div className="flex gap-2">
                          <ShoppingCart className="text-emerald-700" />
                          {/* {totalClosedSessions.length} */} 38
                        </div>
                      </div>
                    )}
                  </>
                }
              />
            </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Page
