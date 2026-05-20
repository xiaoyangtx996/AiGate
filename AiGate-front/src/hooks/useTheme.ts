import { useEffect } from 'react'
import { useThemeStore, Theme } from '@/stores/theme'

export function useTheme() {
  const { theme, setTheme } = useThemeStore()

  useEffect(() => {
    document.documentElement.className = theme
  }, [theme])

  const cycleTheme = () => {
    const themes: Theme[] = ['dark', 'light', 'apple']
    const currentIndex = themes.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  return { theme, setTheme, cycleTheme }
}
