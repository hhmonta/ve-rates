import { NextResponse } from 'next/server';

interface RateData {
  usd_bcv: number | null;
  eur_bcv: number | null;
  usd_yadio: number | null;
  last_update: string;
  sources: {
    bcv: boolean;
    yadio: boolean;
  };
}

// Cache for 5 minutes
let cachedData: RateData | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchBCVRates(): Promise<{ usd: number | null; eur: number | null }> {
  try {
    const response = await fetch('https://ve.dolarapi.com/v1/dolares', {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error('BCV API error:', response.status);
      return { usd: null, eur: null };
    }

    const data = await response.json();

    // Find BCV official rate (API returns 'oficial' in lowercase)
    const bcvOficial = data.find(
      (item: { fuente: string }) => item.fuente.toLowerCase() === 'oficial'
    );

    const usd = bcvOficial?.promedio || null;

    // Fetch EUR rate from BCV
    let eur: number | null = null;
    try {
      const eurResponse = await fetch('https://ve.dolarapi.com/v1/dolares/oficial/euro', {
        next: { revalidate: 300 },
      });
      if (eurResponse.ok) {
        const eurData = await eurResponse.json();
        eur = eurData?.promedio || eurData?.precio || null;
      }
    } catch {
      // If EUR endpoint fails, calculate from USD rate approximately
      console.log('EUR BCV endpoint not available, trying alternative');
    }

    // If we couldn't get EUR directly, try to estimate it
    if (!eur && usd) {
      try {
        const frankfurterResponse = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD', {
          next: { revalidate: 300 },
        });
        if (frankfurterResponse.ok) {
          const frankfurterData = await frankfurterResponse.json();
          const eurToUsd = frankfurterData?.rates?.USD;
          if (eurToUsd) {
            eur = usd / eurToUsd;
          }
        }
      } catch {
        console.log('Frankfurter API not available for EUR calculation');
      }
    }

    return { usd, eur };
  } catch (error) {
    console.error('Error fetching BCV rates:', error);
    return { usd: null, eur: null };
  }
}

async function fetchYadioRate(): Promise<{ usd: number | null; eur: number | null }> {
  try {
    const response = await fetch('https://api.yadio.io/rate/VES', {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error('Yadio API error:', response.status);
      return { usd: null, eur: null };
    }

    const data = await response.json();
    return {
      usd: data?.usd || null,
      eur: data?.eur || null,
    };
  } catch (error) {
    console.error('Error fetching Yadio rate:', error);
    return { usd: null, eur: null };
  }
}

export async function GET() {
  const now = Date.now();

  // Return cached data if still valid
  if (cachedData && now - lastFetchTime < CACHE_DURATION) {
    return NextResponse.json(cachedData);
  }

  // Fetch all rates in parallel
  const [bcvRates, yadioRate] = await Promise.all([
    fetchBCVRates(),
    fetchYadioRate(),
  ]);

  const result: RateData = {
    usd_bcv: bcvRates.usd,
    eur_bcv: bcvRates.eur,
    usd_yadio: yadioRate.usd,
    last_update: new Date().toISOString(),
    sources: {
      bcv: bcvRates.usd !== null,
      yadio: yadioRate.usd !== null,
    },
  };

  // Update cache
  cachedData = result;
  lastFetchTime = now;

  return NextResponse.json(result);
}
