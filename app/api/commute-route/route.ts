import { NextResponse } from 'next/server'

function getNextMondayNineAM(): number {
  const now = new Date()
  const day = now.getDay()
  // Days until next Monday: if Sunday(0)→1, Mon(1)→7, Tue(2)→6, ...
  const daysUntilMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + daysUntilMonday)
  monday.setHours(9, 0, 0, 0)
  return Math.floor(monday.getTime() / 1000)
}

export async function POST(request: Request) {
  try {
    const { origin, destination } = (await request.json()) as {
      origin: string
      destination: string
    }

    if (!origin || !destination) {
      return NextResponse.json(
        { success: false, error: '出発地と目的地が必要です' },
        { status: 400 },
      )
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY

    // No API key — return mock data
    if (!apiKey) {
      return NextResponse.json({
        success: true,
        routeSummary: '（モックデータ）電車ルート',
        duration: '約45分',
        monthlyFare: 14520,
        source: 'mock',
        note: 'Google Maps APIキーが設定されていません。実際のルートに更新してください。',
      })
    }

    // Call Google Maps Directions API
    const departureTime = getNextMondayNineAM()
    const params = new URLSearchParams({
      origin,
      destination,
      mode: 'transit',
      language: 'ja',
      departure_time: String(departureTime),
      key: apiKey,
    })

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?${params}`,
    )
    const data = await res.json()

    if (data.status !== 'OK' || !data.routes?.length) {
      return NextResponse.json({
        success: false,
        error: `ルートが見つかりませんでした (${data.status})`,
      })
    }

    const route = data.routes[0]
    const leg = route.legs?.[0]
    const routeSummary = route.summary || '経路情報'
    const duration = leg?.duration?.text || '不明'

    // Fare: Google Transit API returns fare for some regions
    let monthlyFare: number | null = null
    if (route.fare?.value) {
      // Daily fare × 20 working days = monthly
      monthlyFare = Math.round(route.fare.value * 20)
    }

    return NextResponse.json({
      success: true,
      routeSummary,
      duration,
      monthlyFare,
      source: 'google',
    })
  } catch (error) {
    console.error('Commute route lookup failed:', error)
    return NextResponse.json(
      { success: false, error: 'ルート検索に失敗しました' },
      { status: 500 },
    )
  }
}
