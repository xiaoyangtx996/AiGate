import { useRef, useEffect } from 'react'
import { useThemeStore } from '@/stores/theme'
import { getChartOption } from '@/utils/chartTheme'
import { getEcharts } from '@/utils/lazyEcharts'

interface BarChartProps {
  data: {
    categories: string[]
    series: {
      name: string
      data: number[]
      color?: string
    }[]
  }
  height?: number
  className?: string
  horizontal?: boolean
  yAxisFormatter?: string
}

export function BarChart({
  data,
  height = 300,
  className,
  horizontal = false,
  yAxisFormatter = '{value}',
}: BarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<unknown>(null)
  const { theme } = useThemeStore()

  useEffect(() => {
    if (!chartRef.current) return
    let disposed = false

    getEcharts().then((echarts) => {
      if (disposed || !chartRef.current) return

      const instance = echarts.init(chartRef.current)
      chartInstance.current = instance

      const handleResize = () => instance.resize()
      window.addEventListener('resize', handleResize)

      // Store cleanup ref for outer cleanup
      ;(chartRef.current as HTMLDivElement & { _chartCleanup?: () => void })._chartCleanup = () => {
        window.removeEventListener('resize', handleResize)
        instance.dispose()
      }
    })

    return () => {
      disposed = true
      const cleanup = (chartRef.current as HTMLDivElement & { _chartCleanup?: () => void })?._chartCleanup
      cleanup?.()
    }
  }, [])

  useEffect(() => {
    if (!chartInstance.current) return

    const categoryAxis = horizontal
      ? {
          type: 'value' as const,
          axisLabel: { formatter: yAxisFormatter },
        }
      : {
          type: 'category' as const,
          data: data.categories,
          axisLabel: {
            rotate: data.categories.length > 6 ? 30 : 0,
          },
        }

    const valueAxis = horizontal
      ? {
          type: 'category' as const,
          data: data.categories,
        }
      : {
          type: 'value' as const,
          axisLabel: { formatter: yAxisFormatter },
        }

    const option = getChartOption(theme, {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: data.series.map((s) => s.name),
        top: 0,
        right: 0,
      },
      grid: {
        top: 40,
        right: 20,
        bottom: 40,
        left: horizontal ? 120 : 60,
        containLabel: true,
      },
      xAxis: horizontal ? categoryAxis : valueAxis,
      yAxis: horizontal ? valueAxis : categoryAxis,
      series: data.series.map((s) => ({
        name: s.name,
        type: 'bar',
        barMaxWidth: 24,
        data: s.data,
        ...(s.color ? { itemStyle: { color: s.color } } : {}),
      })),
    })

    ;(chartInstance.current as { setOption: (opt: unknown) => void }).setOption(option)
  }, [data, theme, horizontal, yAxisFormatter])

  return (
    <div
      ref={chartRef}
      style={{ width: '100%', height: `${height}px` }}
      className={className}
    />
  )
}
