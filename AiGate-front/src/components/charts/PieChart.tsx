import { useRef, useEffect } from 'react'
import * as echarts from 'echarts'
import { useThemeStore } from '@/stores/theme'
import { getChartTheme } from '@/utils/chartTheme'

interface PieChartProps {
  data: {
    name: string
    value: number
    color?: string
  }[]
  height?: number
  className?: string
}

export function PieChart({ data, height = 300, className }: PieChartProps) {
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

    const colors = getChartTheme(theme)

    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
        backgroundColor: colors.backgroundColor,
        borderColor: colors.borderColor,
        textStyle: { color: colors.textColor },
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        textStyle: { color: colors.textColorSecondary },
      },
      series: [
        {
          name: '模型调用',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: colors.backgroundColor,
            borderWidth: 2,
          },
          label: {
            show: false,
            position: 'center',
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
              color: colors.textColor,
            },
          },
          labelLine: {
            show: false,
          },
          data: data.map((item) => ({
            ...item,
            itemStyle: item.color ? { color: item.color } : undefined,
          })),
        },
      ],
      backgroundColor: 'transparent',
    }

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
