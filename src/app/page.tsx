'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  DollarSign,
  Euro,
  TrendingUp,
  RefreshCw,
  Calculator,
  ArrowRightLeft,
  CircleDollarSign,
  Clock,
  Zap,
  Download,
  X,
} from 'lucide-react'

interface RateData {
  usd_bcv: number | null
  eur_bcv: number | null
  usd_yadio: number | null
  last_update: string
  sources: {
    bcv: boolean
    yadio: boolean
  }
}

type ConvertDirection = 'VEStoUSD' | 'USDtoVES' | 'VEStoEUR' | 'EURtoVES' | 'VEStoYadio' | 'YadiotoVES'

// Extend Window interface for PWA install prompt
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function formatRate(rate: number | null): string {
  if (rate === null) return 'N/A'
  return rate.toFixed(2)
}

function formatCurrency(amount: number, currency: string): string {
  if (currency === 'VES') {
    return `Bs. ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function Home() {
  const [rates, setRates] = useState<RateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Calculator state
  const [amount, setAmount] = useState<string>('')
  const [direction, setDirection] = useState<ConvertDirection>('USDtoVES')
  const [result, setResult] = useState<number | null>(null)

  // PWA install state
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  // PWA install prompt handler
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
      setShowInstallBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setShowInstallBanner(false)
      setInstallPrompt(null)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') {
      setIsInstalled(true)
      setShowInstallBanner(false)
    }
    setInstallPrompt(null)
  }

  const fetchRates = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await fetch('/api/rates')
      if (res.ok) {
        const data = await res.json()
        setRates(data)
      }
    } catch (error) {
      console.error('Error fetching rates:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchRates()
    const interval = setInterval(() => fetchRates(), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchRates])

  // Calculate conversion
  useEffect(() => {
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || !rates) {
      setResult(null)
      return
    }

    let calculated = 0
    switch (direction) {
      case 'USDtoVES':
        calculated = numAmount * (rates.usd_bcv ?? 0)
        break
      case 'VEStoUSD':
        calculated = rates.usd_bcv ? numAmount / rates.usd_bcv : 0
        break
      case 'EURtoVES':
        calculated = numAmount * (rates.eur_bcv ?? 0)
        break
      case 'VEStoEUR':
        calculated = rates.eur_bcv ? numAmount / rates.eur_bcv : 0
        break
      case 'YadiotoVES':
        calculated = numAmount * (rates.usd_yadio ?? 0)
        break
      case 'VEStoYadio':
        calculated = rates.usd_yadio ? numAmount / rates.usd_yadio : 0
        break
    }

    setResult(calculated)
  }, [amount, direction, rates])

  const getDirectionLabel = (dir: ConvertDirection): string => {
    const labels: Record<ConvertDirection, string> = {
      USDtoVES: 'USD (BCV) → VES',
      VEStoUSD: 'VES → USD (BCV)',
      EURtoVES: 'EUR (BCV) → VES',
      VEStoEUR: 'VES → EUR (BCV)',
      YadiotoVES: 'USD (Yadio) → VES',
      VEStoYadio: 'VES → USD (Yadio)',
    }
    return labels[dir]
  }

  const getFromCurrency = (dir: ConvertDirection): string => {
    if (dir === 'USDtoVES' || dir === 'YadiotoVES') return 'USD'
    if (dir === 'EURtoVES') return 'EUR'
    return 'VES'
  }

  const getToCurrency = (dir: ConvertDirection): string => {
    if (dir === 'VEStoUSD' || dir === 'VEStoYadio') return 'USD'
    if (dir === 'VEStoEUR') return 'EUR'
    return 'VES'
  }

  const swapDirection = () => {
    const swaps: Record<ConvertDirection, ConvertDirection> = {
      USDtoVES: 'VEStoUSD',
      VEStoUSD: 'USDtoVES',
      EURtoVES: 'VEStoEUR',
      VEStoEUR: 'EURtoVES',
      YadiotoVES: 'VEStoYadio',
      VEStoYadio: 'YadiotoVES',
    }
    setDirection(swaps[direction])
    setAmount('')
    setResult(null)
  }

  const lastUpdateTime = rates?.last_update
    ? new Date(rates.last_update).toLocaleTimeString('es-VE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '--:--'

  return (
    <div className="min-h-screen bg-background">
      {/* PWA Install Banner */}
      {showInstallBanner && !isInstalled && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-3 shadow-lg shadow-emerald-600/30">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Instalar VE Rates</p>
                <p className="text-xs text-white/80">Acceso rápido desde tu pantalla de inicio</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleInstall}
                className="bg-white text-emerald-700 hover:bg-white/90 h-8 text-xs font-semibold"
              >
                Instalar
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowInstallBanner(false)}
                className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl ${showInstallBanner && !isInstalled ? 'mt-12' : ''}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CircleDollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">
                VE Rates
              </h1>
              <p className="text-xs text-muted-foreground">
                Tasas de cambio en tiempo real
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>{lastUpdateTime}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fetchRates(true)}
              disabled={refreshing}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Rates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* USD BCV Card */}
          <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm hover:border-emerald-500/30 transition-colors">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />
            <CardHeader className="pb-2 pt-5 px-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                  </div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Dólar BCV
                  </CardTitle>
                </div>
                <Badge
                  variant="secondary"
                  className="text-[10px] bg-emerald-500/10 text-emerald-500 border-0"
                >
                  OFICIAL
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {loading ? (
                <div className="h-10 w-32 bg-muted/50 animate-pulse rounded-md" />
              ) : (
                <div className="space-y-1">
                  <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                    {formatRate(rates?.usd_bcv)}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      Bs.
                    </span>
                  </p>
                  <div className="flex items-center gap-1 text-xs text-emerald-500">
                    <TrendingUp className="w-3 h-3" />
                    <span>Tasa oficial BCV</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* EUR BCV Card */}
          <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm hover:border-blue-500/30 transition-colors">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
            <CardHeader className="pb-2 pt-5 px-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Euro className="w-4 h-4 text-blue-500" />
                  </div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Euro BCV
                  </CardTitle>
                </div>
                <Badge
                  variant="secondary"
                  className="text-[10px] bg-blue-500/10 text-blue-500 border-0"
                >
                  OFICIAL
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {loading ? (
                <div className="h-10 w-32 bg-muted/50 animate-pulse rounded-md" />
              ) : (
                <div className="space-y-1">
                  <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                    {formatRate(rates?.eur_bcv)}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      Bs.
                    </span>
                  </p>
                  <div className="flex items-center gap-1 text-xs text-blue-500">
                    <TrendingUp className="w-3 h-3" />
                    <span>Tasa oficial BCV</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Yadio Card */}
          <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm hover:border-amber-500/30 transition-colors">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-amber-600" />
            <CardHeader className="pb-2 pt-5 px-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-amber-500" />
                  </div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Dólar Yadio
                  </CardTitle>
                </div>
                <Badge
                  variant="secondary"
                  className="text-[10px] bg-amber-500/10 text-amber-500 border-0"
                >
                  YADIO
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {loading ? (
                <div className="h-10 w-32 bg-muted/50 animate-pulse rounded-md" />
              ) : (
                <div className="space-y-1">
                  <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                    {formatRate(rates?.usd_yadio)}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      Bs.
                    </span>
                  </p>
                  <div className="flex items-center gap-1 text-xs text-amber-500">
                    <TrendingUp className="w-3 h-3" />
                    <span>Tasa Yadio.io</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Spread Info */}
        {rates?.usd_bcv && rates?.usd_yadio && (
          <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
            <CardContent className="py-3 px-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Diferencia BCV vs Yadio
                </span>
                <span
                  className={
                    rates.usd_yadio > rates.usd_bcv
                      ? 'text-amber-500 font-medium'
                      : 'text-emerald-500 font-medium'
                  }
                >
                  {(
                    ((rates.usd_yadio - rates.usd_bcv) / rates.usd_bcv) *
                    100
                  ).toFixed(2)}
                  %
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calculator */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Calculator className="w-4 h-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  Calculadora de Divisas
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Convierte entre bolívares y divisas
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Direction Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(
                [
                  'USDtoVES',
                  'VEStoUSD',
                  'EURtoVES',
                  'VEStoEUR',
                  'YadiotoVES',
                  'VEStoYadio',
                ] as ConvertDirection[]
              ).map((dir) => (
                <Button
                  key={dir}
                  variant={direction === dir ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setDirection(dir)
                    setAmount('')
                    setResult(null)
                  }}
                  className={`text-xs h-8 ${
                    direction === dir
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white border-0 shadow-lg shadow-violet-500/20'
                      : 'border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  {getDirectionLabel(dir)}
                </Button>
              ))}
            </div>

            <Separator className="bg-border/50" />

            {/* Input Area */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Monto en {getFromCurrency(direction)}
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder={`Ingrese monto en ${getFromCurrency(direction)}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-12 text-lg bg-background/50 border-border/50 focus:border-violet-500/50 focus:ring-violet-500/20 pl-4 pr-16"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Badge
                      variant="secondary"
                      className="text-xs bg-muted/80"
                    >
                      {getFromCurrency(direction)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={swapDirection}
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </Button>
              </div>

              {/* Result */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Resultado en {getToCurrency(direction)}
                </label>
                <div className="h-14 rounded-lg bg-gradient-to-r from-violet-500/5 to-purple-500/5 border border-violet-500/10 flex items-center px-4">
                  {result !== null && !isNaN(result) ? (
                    <p className="text-xl font-bold text-foreground">
                      {formatCurrency(result, getToCurrency(direction))}
                    </p>
                  ) : (
                    <p className="text-xl text-muted-foreground/50">
                      --
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Rate used */}
            {rates && amount && !isNaN(parseFloat(amount)) && (
              <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                <span className="font-medium">Tasa aplicada:</span>{' '}
                {direction.includes('Yadio')
                  ? `1 USD = ${formatRate(rates.usd_yadio)} Bs. (Yadio)`
                  : direction.includes('EUR')
                  ? `1 EUR = ${formatRate(rates.eur_bcv)} Bs. (BCV)`
                  : `1 USD = ${formatRate(rates.usd_bcv)} Bs. (BCV)`}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Amounts */}
        <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
          <CardContent className="py-4 px-5">
            <p className="text-xs font-medium text-muted-foreground mb-3">
              Cantidades rápidas
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {[1, 5, 10, 20, 50, 100, 500, 1000].map((val) => (
                <Button
                  key={val}
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(val.toString())}
                  className="text-xs h-8 border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                >
                  {val}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="text-center py-4 text-xs text-muted-foreground/60">
          <p>
            Fuentes: BCV (Banco Central de Venezuela) · Yadio.io
          </p>
          <p className="mt-1">
            Las tasas se actualizan automáticamente cada 5 minutos
          </p>
        </footer>
      </main>
    </div>
  )
}
