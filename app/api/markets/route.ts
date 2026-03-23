import { NextRequest, NextResponse } from 'next/server'

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'

const CRYPTO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  MATIC: 'matic-network',
  DOT: 'polkadot',
  AVAX: 'avalanche-2',
  LINK: 'chainlink',
  UNI: 'uniswap',
  LTC: 'litecoin',
  ATOM: 'cosmos',
  NEAR: 'near',
}

const KNOWN_CRYPTO_SYMBOLS = new Set(Object.keys(CRYPTO_IDS))

function detectAssetType(ticker: string): 'crypto' | 'stock' {
  return KNOWN_CRYPTO_SYMBOLS.has(ticker.toUpperCase()) ? 'crypto' : 'stock'
}

async function fetchCrypto(ticker: string) {
  const id = CRYPTO_IDS[ticker.toUpperCase()]
  if (!id) throw new Error(`Unknown crypto symbol: ${ticker}`)

  const res = await fetch(
    `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${id}&price_change_percentage=24h`,
    { next: { revalidate: 300 } }
  )

  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`)

  const data = await res.json()
  if (!data.length) throw new Error('No data returned')

  const coin = data[0]
  return {
    ticker: ticker.toUpperCase(),
    name: coin.name,
    price: coin.current_price,
    change24h: coin.price_change_percentage_24h,
    high24h: coin.high_24h,
    low24h: coin.low_24h,
    marketCap: coin.market_cap,
    volume24h: coin.total_volume,
    source: 'CoinGecko',
    assetType: 'crypto',
  }
}

async function fetchStock(ticker: string) {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1d`,
    {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 300 },
    }
  )

  if (!res.ok) throw new Error(`Yahoo Finance error: ${res.status}`)

  const data = await res.json()
  const meta = data?.chart?.result?.[0]?.meta
  if (!meta) throw new Error('No data returned from Yahoo Finance')

  const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? 0
  const price = meta.regularMarketPrice ?? meta.price ?? 0
  const change24h = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0

  return {
    ticker: ticker.toUpperCase(),
    name: meta.shortName || meta.symbol || ticker,
    price,
    change24h,
    high24h: meta.regularMarketDayHigh ?? price,
    low24h: meta.regularMarketDayLow ?? price,
    marketCap: meta.marketCap ?? 0,
    volume24h: meta.regularMarketVolume ?? 0,
    source: 'Yahoo Finance',
    assetType: 'stock',
    currency: meta.currency ?? 'USD',
    exchange: meta.exchangeName ?? '',
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const ticker = searchParams.get('ticker')?.trim().toUpperCase()

  if (!ticker) {
    return NextResponse.json(
      { error: 'ticker parameter is required' },
      { status: 400 }
    )
  }

  try {
    const assetType = detectAssetType(ticker)
    const quote =
      assetType === 'crypto' ? await fetchCrypto(ticker) : await fetchStock(ticker)

    return NextResponse.json(quote)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch quote'
    return NextResponse.json({ error: message, ticker }, { status: 502 })
  }
}
