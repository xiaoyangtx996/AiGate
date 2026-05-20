import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, BarChart3, Key, Puzzle, BookOpen, Bot, Users2, FileText, Clock } from 'lucide-react'
import { useUIStore } from '@/stores/ui'
import { useAuth } from '@/hooks/useAuth'
import { clsx } from 'clsx'

interface SearchResult {
  id: string
  type: 'menu' | 'user' | 'key' | 'mcp' | 'knowledge' | 'agent'
  label: string
  description?: string
  path: string
  icon: React.ReactNode
}

// Mock data - in production, this would come from API
const MOCK_DATA: SearchResult[] = [
  { id: '1', type: 'menu', label: '数据大盘', path: '/dashboard', icon: <BarChart3 size={16} /> },
  { id: '2', type: 'menu', label: '密钥管理', path: '/keys', icon: <Key size={16} /> },
  { id: '3', type: 'menu', label: 'MCP 工具', path: '/mcp', icon: <Puzzle size={16} /> },
  { id: '4', type: 'menu', label: '知识库', path: '/knowledge', icon: <BookOpen size={16} /> },
  { id: '5', type: 'menu', label: 'Agent 中心', path: '/agent', icon: <Bot size={16} /> },
  { id: '6', type: 'menu', label: '用户管理', path: '/users', icon: <Users2 size={16} /> },
  { id: '7', type: 'menu', label: '调用日志', path: '/logs', icon: <FileText size={16} /> },
  // Mock users
  { id: '10', type: 'user', label: '张三', description: 'zhangsan@aigate.com', path: '/users', icon: <Users2 size={16} /> },
  { id: '11', type: 'user', label: '李四', description: 'lisi@aigate.com', path: '/users', icon: <Users2 size={16} /> },
  // Mock keys
  { id: '20', type: 'key', label: 'Cursor 专用', description: 'ag-prod-8f2c...e1b9', path: '/keys', icon: <Key size={16} /> },
  // Mock MCP
  { id: '30', type: 'mcp', label: 'GitHub API', description: '代码库搜索、Issue 管理', path: '/mcp', icon: <Puzzle size={16} /> },
  // Mock knowledge
  { id: '40', type: 'knowledge', label: 'AiGate 设计文档', path: '/knowledge', icon: <BookOpen size={16} /> },
  // Mock agents
  { id: '50', type: 'agent', label: 'AiGate Bot', description: '管理 Agent', path: '/agent', icon: <Bot size={16} /> },
]

const TYPE_LABELS: Record<string, string> = {
  menu: '菜单',
  user: '员工',
  key: '密钥',
  mcp: 'MCP',
  knowledge: '知识库',
  agent: 'Agent',
}

export function GlobalSearch() {
  const navigate = useNavigate()
  const { searchOpen, setSearchOpen, recentSearches, addRecentSearch } = useUIStore()
  useAuth()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Filter results based on query and role
  const results = query.trim()
    ? MOCK_DATA.filter((item) => {
        const matchesQuery = item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.description?.toLowerCase().includes(query.toLowerCase())
        return matchesQuery
      }).slice(0, 20)
    : []

  // Group results by type
  const groupedResults = results.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = []
    acc[item.type].push(item)
    return acc
  }, {} as Record<string, SearchResult[]>)

  // Reset state when opening/closing
  useEffect(() => {
    if (searchOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [searchOpen])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      handleSelect(results[selectedIndex])
    } else if (e.key === 'Escape') {
      setSearchOpen(false)
    }
  }, [results, selectedIndex])

  // Select result
  const handleSelect = (result: SearchResult) => {
    addRecentSearch(result.label)
    navigate(result.path)
    setSearchOpen(false)
  }

  if (!searchOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={() => setSearchOpen(false)}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Search dialog */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-lg overflow-hidden"
        style={{ backgroundColor: 'var(--bg-surface)', boxShadow: 'var(--shadow-dropdown)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <Search size={18} className="text-secondary flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0) }}
            onKeyDown={handleKeyDown}
            placeholder="搜索菜单、员工、密钥、MCP..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--text-primary)' }}
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs rounded"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={resultsRef} className="max-h-[300px] overflow-y-auto p-2">
          {query.trim() === '' ? (
            /* Recent searches */
            recentSearches.length > 0 && (
              <div>
                <div className="px-2 py-1.5 text-xs font-medium text-secondary flex items-center gap-2">
                  <Clock size={12} /> 最近搜索
                </div>
                {recentSearches.map((term, index) => (
                  <button
                    key={index}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded hover:bg-elevated transition-colors text-left"
                    style={{ color: 'var(--text-primary)' }}
                    onClick={() => setQuery(term)}
                  >
                    <Search size={14} className="text-secondary" />
                    {term}
                  </button>
                ))}
              </div>
            )
          ) : results.length === 0 ? (
            /* No results */
            <div className="px-4 py-8 text-center text-secondary text-sm">
              未找到匹配项
            </div>
          ) : (
            /* Search results */
            Object.entries(groupedResults).map(([type, items]) => (
              <div key={type}>
                <div className="px-2 py-1.5 text-xs font-medium text-secondary">
                  {TYPE_LABELS[type]}
                </div>
                {items.map((item) => {
                  const globalIndex = results.indexOf(item)
                  return (
                    <button
                      key={item.id}
                      className={clsx(
                        'w-full flex items-center gap-3 px-3 py-2 rounded transition-colors text-left',
                        globalIndex === selectedIndex ? 'bg-elevated' : 'hover:bg-elevated'
                      )}
                      style={{ color: 'var(--text-primary)' }}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                    >
                      <span className="flex-shrink-0 text-secondary">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.label}</div>
                        {item.description && (
                          <div className="text-xs text-secondary truncate">{item.description}</div>
                        )}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                        {TYPE_LABELS[item.type]}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
