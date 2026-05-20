import { useRef, useEffect } from 'react'
import * as echarts from 'echarts'
import { useThemeStore } from '@/stores/theme'
import { getChartOption } from '@/utils/chartTheme'

interface LineChartProps {
  data: {
    dates: string[]
    series: {
      name: string
      data: number[]
      color?: string
    }[]
  }
  height?: number
  className?: string
}

export function LineChart({ data, height = 300, className }: LineChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const { theme } = useThemeStore()

  useEffect(() => {
    if (!chartRef.current) return

    chartInstance.current = echarts.init(chartRef.current)

    const handleResize = () => {
      chartInstance.current?.resize()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chartInstance.current?.dispose()
    }
  }, [])

  useEffect(() => {
    if (!chartInstance.current) return

    const option = getChartOption(theme, {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985',
          },
        },
      },
      legend: {
        data: data.series.map((s) => s.name),
        top: 0,
        right: 0,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: data.dates,
      },
      yAxis: {
        type: 'value',
        name: 'Token (M)',
        axisLabel: {
          formatter: '{value}M',
        },
      },
      series: data.series.map((s) => ({
        name: s.name,
        type: 'line',
        stack: 'Total',
        smooth: true,
        lineStyle: {
          width: 2,
        },
        showSymbol: false,
        areaStyle: {
          opacity: 0.15,
        },
        emphasis: {
          focus: 'series',
        },
        data: s.data,
        ...(s.color ? { itemStyle: { color: s.color } } : {}),
      })),
    })

    chartInstance.current.setOption(option)
  }, [data, theme])

  return (
    <div
      ref={chartRef}
      style={{ width: '100%', height: `${height}px` }}
      className={className}
    />
  )
}
