import { Theme } from '@/stores/theme'

// Chart theme colors for each theme
const themeColors: Record<Theme, {
  textColor: string
  textColorSecondary: string
  backgroundColor: string
  borderColor: string
  brandMain: string
  brandAccent: string
  success: string
  warning: string
  error: string
}> = {
  dark: {
    textColor: '#f4f4f5',
    textColorSecondary: '#a1a1aa',
    backgroundColor: '#18181b',
    borderColor: '#27272a',
    brandMain: '#10b981',
    brandAccent: '#f59e0b',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  light: {
    textColor: '#111827',
    textColorSecondary: '#6b7280',
    backgroundColor: '#ffffff',
    borderColor: '#111827',
    brandMain: '#ea580c',
    brandAccent: '#059669',
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
  },
  apple: {
    textColor: '#1d1d1f',
    textColorSecondary: '#86868b',
    backgroundColor: '#f5f5f7',
    borderColor: 'rgba(0, 0, 0, 0.05)',
    brandMain: '#0066cc',
    brandAccent: '#ff3b30',
    success: '#34c759',
    warning: '#ff9500',
    error: '#ff3b30',
  },
}

export function getChartTheme(theme: Theme) {
  return themeColors[theme] || themeColors.dark
}

export function getChartOption(theme: Theme, options: any) {
  const colors = getChartTheme(theme)

  return {
    ...options,
    textStyle: {
      color: colors.textColorSecondary,
      fontFamily: 'ui-sans-serif, -apple-system, "Segoe UI", sans-serif',
      ...options.textStyle,
    },
    backgroundColor: 'transparent',
    grid: {
      top: 40,
      right: 20,
      bottom: 40,
      left: 60,
      containLabel: true,
      ...options.grid,
    },
    xAxis: {
      axisLine: { lineStyle: { color: colors.borderColor } },
      axisTick: { lineStyle: { color: colors.borderColor } },
      axisLabel: { color: colors.textColorSecondary },
      splitLine: { lineStyle: { color: colors.borderColor, type: 'dashed' } },
      ...options.xAxis,
    },
    yAxis: {
      axisLine: { lineStyle: { color: colors.borderColor } },
      axisTick: { lineStyle: { color: colors.borderColor } },
      axisLabel: { color: colors.textColorSecondary },
      splitLine: { lineStyle: { color: colors.borderColor, type: 'dashed' } },
      ...options.yAxis,
    },
    tooltip: {
      backgroundColor: colors.backgroundColor,
      borderColor: colors.borderColor,
      textStyle: { color: colors.textColor },
      ...options.tooltip,
    },
    legend: {
      textStyle: { color: colors.textColorSecondary },
      ...options.legend,
    },
  }
}
