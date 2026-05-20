import { useEffect } from 'react'
import { useUIStore } from '@/stores/ui'

export function useKeyboard() {
  const { setSearchOpen, searchOpen } = useUIStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K / Ctrl+K 打开搜索
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(!searchOpen)
      }

      // Esc 关闭搜索
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchOpen, setSearchOpen])
}
