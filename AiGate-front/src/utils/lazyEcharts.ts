import type * as EChartsType from 'echarts'

let echartsPromise: Promise<typeof EChartsType> | null = null

/**
 * Lazy-load the full echarts library on first use.
 * Returns the same cached promise on subsequent calls.
 */
export function getEcharts(): Promise<typeof EChartsType> {
  if (!echartsPromise) {
    echartsPromise = import('echarts')
  }
  return echartsPromise
}
