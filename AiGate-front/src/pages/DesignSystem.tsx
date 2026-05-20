import { useState } from 'react'
import {
  Sun, Moon, Monitor, Copy, Check, Search, Settings, Bell, User, Home, FileText,
  Folder, Database, Shield, Key, BarChart3, Zap, Globe, Lock, Unlock, Eye, EyeOff,
  Plus, Minus, X, CheckCircle, AlertTriangle, Info, AlertCircle, ChevronDown,
  ChevronRight, ChevronLeft, ChevronUp, ArrowRight, ArrowLeft, RefreshCw, Trash2,
  Edit, Download, Upload, Filter, MoreHorizontal, ExternalLink, Link, Mail, Phone,
  Calendar, Clock, Star, Heart, Bookmark, Share, MessageSquare, Send, Inbox,
  Archive, Printer, Save, Clipboard, Terminal, Code, Cpu, HardDrive, Wifi,
  Activity, TrendingUp, TrendingDown, Layers, Grid, List, Map, Navigation,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useThemeStore, type Theme } from '@/stores/theme'

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                    */
/* ------------------------------------------------------------------ */

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      {children}
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>{title}</h3>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Copy button                                                        */
/* ------------------------------------------------------------------ */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded transition-colors hover:opacity-80"
      style={{ color: 'var(--text-secondary)' }}
      title="Copy value"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Color Swatch                                                       */
/* ------------------------------------------------------------------ */

function ColorSwatch({ name, variable, value }: { name: string; variable: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-lg border shrink-0"
        style={{ backgroundColor: value, borderColor: 'var(--border-color)' }}
      />
      <div className="min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{name}</div>
        <div className="flex items-center gap-1">
          <code className="text-xs" style={{ color: 'var(--text-secondary)' }}>{variable}</code>
          <CopyButton text={variable} />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Theme definitions                                                  */
/* ------------------------------------------------------------------ */

const themeOptions: { key: Theme; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: 'dark', label: 'Dark', icon: <Moon size={18} />, desc: 'Emerald #10b981, 圆角 0.75rem' },
  { key: 'light', label: 'Light', icon: <Sun size={18} />, desc: 'Orange #ea580c, 圆角 0' },
  { key: 'apple', label: 'Apple', icon: <Monitor size={18} />, desc: 'Blue #0066cc, 圆角 1.125rem' },
]

/* ------------------------------------------------------------------ */
/*  Color palettes                                                     */
/* ------------------------------------------------------------------ */

const brandColors = [
  { name: 'Brand Main', variable: 'var(--brand-main)', css: '--brand-main' },
  { name: 'Brand Main Hover', variable: 'var(--brand-main-hover)', css: '--brand-main-hover' },
  { name: 'Brand Accent', variable: 'var(--brand-accent)', css: '--brand-accent' },
  { name: 'Brand Accent Hover', variable: 'var(--brand-accent-hover)', css: '--brand-accent-hover' },
]

const statusColors = [
  { name: 'Success', variable: 'var(--success)', css: '--success' },
  { name: 'Warning', variable: 'var(--warning)', css: '--warning' },
  { name: 'Error', variable: 'var(--error)', css: '--error' },
  { name: 'Info', variable: 'var(--info)', css: '--info' },
]

const neutralColors = [
  { name: 'Bg Body', variable: 'var(--bg-body)', css: '--bg-body' },
  { name: 'Bg Surface', variable: 'var(--bg-surface)', css: '--bg-surface' },
  { name: 'Bg Elevated', variable: 'var(--bg-elevated)', css: '--bg-elevated' },
  { name: 'Border', variable: 'var(--border-color)', css: '--border-color' },
  { name: 'Text Primary', variable: 'var(--text-primary)', css: '--text-primary' },
  { name: 'Text Secondary', variable: 'var(--text-secondary)', css: '--text-secondary' },
  { name: 'Text Muted', variable: 'var(--text-muted)', css: '--text-muted' },
]

/* ------------------------------------------------------------------ */
/*  Theme literal color values for preview                             */
/* ------------------------------------------------------------------ */

const themeColorMap: Record<Theme, Record<string, string>> = {
  dark: {
    '--brand-main': '#10b981', '--brand-main-hover': '#34d399', '--brand-accent': '#f59e0b', '--brand-accent-hover': '#fbbf24',
    '--success': '#10b981', '--warning': '#f59e0b', '--error': '#ef4444', '--info': '#06b6d4',
    '--bg-body': '#09090b', '--bg-surface': '#18181b', '--bg-elevated': '#27272a', '--border-color': '#27272a',
    '--text-primary': '#f4f4f5', '--text-secondary': '#a1a1aa', '--text-muted': '#71717a',
  },
  light: {
    '--brand-main': '#ea580c', '--brand-main-hover': '#f97316', '--brand-accent': '#059669', '--brand-accent-hover': '#10b981',
    '--success': '#059669', '--warning': '#d97706', '--error': '#dc2626', '--info': '#0891b2',
    '--bg-body': '#ffffff', '--bg-surface': '#ffffff', '--bg-elevated': '#f4f4f5', '--border-color': '#111827',
    '--text-primary': '#111827', '--text-secondary': '#6b7280', '--text-muted': '#9ca3af',
  },
  apple: {
    '--brand-main': '#0066cc', '--brand-main-hover': '#0077ed', '--brand-accent': '#ff3b30', '--brand-accent-hover': '#ff6961',
    '--success': '#34c759', '--warning': '#ff9500', '--error': '#ff3b30', '--info': '#007aff',
    '--bg-body': '#f5f5f7', '--bg-surface': 'rgba(255,255,255,0.65)', '--bg-elevated': 'rgba(255,255,255,0.8)', '--border-color': 'rgba(0,0,0,0.05)',
    '--text-primary': '#1d1d1f', '--text-secondary': '#86868b', '--text-muted': '#aeaeb2',
  },
}

/* ------------------------------------------------------------------ */
/*  Typography scale                                                   */
/* ------------------------------------------------------------------ */

const typeScale = [
  { name: 'Display', size: '36px', weight: '700', lineHeight: '1.25', sample: 'AiGate Enterprise' },
  { name: 'H1', size: '30px', weight: '700', lineHeight: '1.25', sample: 'Page Title' },
  { name: 'H2', size: '24px', weight: '600', lineHeight: '1.25', sample: 'Section Heading' },
  { name: 'H3', size: '20px', weight: '600', lineHeight: '1.25', sample: 'Card Title' },
  { name: 'H4', size: '18px', weight: '600', lineHeight: '1.25', sample: 'Subsection' },
  { name: 'Body', size: '14px', weight: '400', lineHeight: '1.6', sample: 'Default body text for paragraphs and content.' },
  { name: 'Body Small', size: '12px', weight: '400', lineHeight: '1.6', sample: 'Secondary text and descriptions.' },
  { name: 'Data Large', size: '30px', weight: '700', lineHeight: '1.0', sample: '84.2M', mono: true },
  { name: 'Data', size: '20px', weight: '600', lineHeight: '1.0', sample: '1,245', mono: true },
  { name: 'Mono / Code', size: '14px', weight: '400', lineHeight: '1.6', sample: 'ag-prod-a3f8c2d1', mono: true },
]

/* ------------------------------------------------------------------ */
/*  Icon sets                                                          */
/* ------------------------------------------------------------------ */

const iconSets: { category: string; icons: { name: string; icon: React.ReactNode }[] }[] = [
  {
    category: 'Navigation',
    icons: [
      { name: 'Home', icon: <Home size={20} /> },
      { name: 'Settings', icon: <Settings size={20} /> },
      { name: 'Search', icon: <Search size={20} /> },
      { name: 'Bell', icon: <Bell size={20} /> },
      { name: 'User', icon: <User size={20} /> },
      { name: 'Grid', icon: <Grid size={20} /> },
      { name: 'List', icon: <List size={20} /> },
      { name: 'Filter', icon: <Filter size={20} /> },
      { name: 'MoreHorizontal', icon: <MoreHorizontal size={20} /> },
      { name: 'Navigation', icon: <Navigation size={20} /> },
    ],
  },
  {
    category: 'Actions',
    icons: [
      { name: 'Plus', icon: <Plus size={20} /> },
      { name: 'Minus', icon: <Minus size={20} /> },
      { name: 'X', icon: <X size={20} /> },
      { name: 'Edit', icon: <Edit size={20} /> },
      { name: 'Trash2', icon: <Trash2 size={20} /> },
      { name: 'Download', icon: <Download size={20} /> },
      { name: 'Upload', icon: <Upload size={20} /> },
      { name: 'Save', icon: <Save size={20} /> },
      { name: 'Copy', icon: <Copy size={20} /> },
      { name: 'RefreshCw', icon: <RefreshCw size={20} /> },
      { name: 'Send', icon: <Send size={20} /> },
      { name: 'Share', icon: <Share size={20} /> },
    ],
  },
  {
    category: 'Status',
    icons: [
      { name: 'CheckCircle', icon: <CheckCircle size={20} /> },
      { name: 'AlertTriangle', icon: <AlertTriangle size={20} /> },
      { name: 'AlertCircle', icon: <AlertCircle size={20} /> },
      { name: 'Info', icon: <Info size={20} /> },
      { name: 'Eye', icon: <Eye size={20} /> },
      { name: 'EyeOff', icon: <EyeOff size={20} /> },
      { name: 'Lock', icon: <Lock size={20} /> },
      { name: 'Unlock', icon: <Unlock size={20} /> },
      { name: 'Shield', icon: <Shield size={20} /> },
    ],
  },
  {
    category: 'Data & Business',
    icons: [
      { name: 'BarChart3', icon: <BarChart3 size={20} /> },
      { name: 'TrendingUp', icon: <TrendingUp size={20} /> },
      { name: 'TrendingDown', icon: <TrendingDown size={20} /> },
      { name: 'Activity', icon: <Activity size={20} /> },
      { name: 'Database', icon: <Database size={20} /> },
      { name: 'Key', icon: <Key size={20} /> },
      { name: 'FileText', icon: <FileText size={20} /> },
      { name: 'Folder', icon: <Folder size={20} /> },
      { name: 'Layers', icon: <Layers size={20} /> },
      { name: 'Globe', icon: <Globe size={20} /> },
      { name: 'Zap', icon: <Zap size={20} /> },
    ],
  },
  {
    category: 'Communication',
    icons: [
      { name: 'Mail', icon: <Mail size={20} /> },
      { name: 'Phone', icon: <Phone size={20} /> },
      { name: 'MessageSquare', icon: <MessageSquare size={20} /> },
      { name: 'Inbox', icon: <Inbox size={20} /> },
      { name: 'Archive', icon: <Archive size={20} /> },
      { name: 'Star', icon: <Star size={20} /> },
      { name: 'Heart', icon: <Heart size={20} /> },
      { name: 'Bookmark', icon: <Bookmark size={20} /> },
      { name: 'Calendar', icon: <Calendar size={20} /> },
      { name: 'Clock', icon: <Clock size={20} /> },
    ],
  },
  {
    category: 'Chevrons & Arrows',
    icons: [
      { name: 'ChevronDown', icon: <ChevronDown size={20} /> },
      { name: 'ChevronUp', icon: <ChevronUp size={20} /> },
      { name: 'ChevronLeft', icon: <ChevronLeft size={20} /> },
      { name: 'ChevronRight', icon: <ChevronRight size={20} /> },
      { name: 'ArrowLeft', icon: <ArrowLeft size={20} /> },
      { name: 'ArrowRight', icon: <ArrowRight size={20} /> },
      { name: 'ExternalLink', icon: <ExternalLink size={20} /> },
      { name: 'Link', icon: <Link size={20} /> },
    ],
  },
  {
    category: 'Tech',
    icons: [
      { name: 'Terminal', icon: <Terminal size={20} /> },
      { name: 'Code', icon: <Code size={20} /> },
      { name: 'Cpu', icon: <Cpu size={20} /> },
      { name: 'HardDrive', icon: <HardDrive size={20} /> },
      { name: 'Wifi', icon: <Wifi size={20} /> },
      { name: 'Printer', icon: <Printer size={20} /> },
      { name: 'Clipboard', icon: <Clipboard size={20} /> },
      { name: 'Map', icon: <Map size={20} /> },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  Table sample data                                                  */
/* ------------------------------------------------------------------ */

const tableRows = [
  { id: 'KEY-001', name: 'prod-frontend', env: 'PROD', status: 'active', usage: '2.4M', expires: '2026-12-01' },
  { id: 'KEY-002', name: 'staging-backend', env: 'STAGING', status: 'active', usage: '890K', expires: '2026-09-15' },
  { id: 'KEY-003', name: 'dev-testing', env: 'DEV', status: 'expired', usage: '120K', expires: '2026-03-01' },
]

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function DesignSystem() {
  const { theme, setTheme } = useThemeStore()
  const [iconSearch, setIconSearch] = useState('')

  const currentColors = themeColorMap[theme]

  const filteredIconSets = iconSearch
    ? iconSets
        .map((group) => ({
          ...group,
          icons: group.icons.filter((i) => i.name.toLowerCase().includes(iconSearch.toLowerCase())),
        }))
        .filter((group) => group.icons.length > 0)
    : iconSets

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <PageHeader
        title="Design System"
        subtitle="AiGate v2.0 设计规范、Token 体系与组件库"
      />

      {/* ============================================================== */}
      {/*  1. Theme Switching                                              */}
      {/* ============================================================== */}
      <Section title="1. Theme Switching">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {themeOptions.map((t) => (
            <button
              key={t.key}
              onClick={() => setTheme(t.key)}
              className="card text-left transition-all"
              style={{
                borderWidth: theme === t.key ? 2 : 1,
                borderColor: theme === t.key ? 'var(--brand-main)' : 'var(--border-color)',
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <span style={{ color: theme === t.key ? 'var(--brand-main)' : 'var(--text-secondary)' }}>{t.icon}</span>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t.label}</span>
                {theme === t.key && (
                  <Badge variant="success" size="sm">Active</Badge>
                )}
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t.desc}</p>
            </button>
          ))}
        </div>
        <p className="text-sm mt-3" style={{ color: 'var(--text-muted)' }}>
          Current: <code className="font-mono">{'<html class="' + theme + '">'}</code> -- switch via <code className="font-mono">useThemeStore()</code>
        </p>
      </Section>

      {/* ============================================================== */}
      {/*  2. Color System                                                 */}
      {/* ============================================================== */}
      <Section title="2. Color System">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Brand Colors */}
          <Card>
            <CardHeader>
              <CardTitle>Brand Colors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {brandColors.map((c) => (
                  <ColorSwatch key={c.css} name={c.name} variable={c.css} value={currentColors[c.css]} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Status Colors */}
          <Card>
            <CardHeader>
              <CardTitle>Status Colors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statusColors.map((c) => (
                  <ColorSwatch key={c.css} name={c.name} variable={c.css} value={currentColors[c.css]} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Neutral Colors */}
          <Card>
            <CardHeader>
              <CardTitle>Neutral / Surface</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {neutralColors.map((c) => (
                  <ColorSwatch key={c.css} name={c.name} variable={c.css} value={currentColors[c.css]} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Three-theme color comparison */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Three-Theme Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th className="text-left py-2 pr-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Token</th>
                    <th className="text-left py-2 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Dark</th>
                    <th className="text-left py-2 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Light</th>
                    <th className="text-left py-2 pl-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Apple</th>
                  </tr>
                </thead>
                <tbody>
                  {['--brand-main', '--brand-accent', '--success', '--warning', '--error', '--info'].map((token) => (
                    <tr key={token} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td className="py-2 pr-4">
                        <code className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>{token}</code>
                      </td>
                      {(['dark', 'light', 'apple'] as Theme[]).map((t) => (
                        <td key={t} className="py-2 px-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-5 h-5 rounded border shrink-0"
                              style={{ backgroundColor: themeColorMap[t][token], borderColor: 'var(--border-color)' }}
                            />
                            <code className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                              {themeColorMap[t][token]}
                            </code>
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* ============================================================== */}
      {/*  3. Typography                                                   */}
      {/* ============================================================== */}
      <Section title="3. Typography">
        <Card>
          <CardContent>
            <div className="space-y-5">
              {typeScale.map((t) => (
                <div key={t.name} className="flex items-baseline gap-6 py-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <div className="w-28 shrink-0">
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {t.size} / {t.weight} / {t.lineHeight}
                    </div>
                  </div>
                  <div
                    className="flex-1 truncate"
                    style={{
                      fontSize: t.size,
                      fontWeight: t.weight,
                      lineHeight: t.lineHeight,
                      fontFamily: t.mono ? 'ui-monospace, "JetBrains Mono", Consolas, monospace' : undefined,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {t.sample}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* ============================================================== */}
      {/*  4. Buttons                                                      */}
      {/* ============================================================== */}
      <Section title="4. Buttons">
        <Card>
          <CardContent>
            <div className="space-y-6">
              {/* Variants */}
              <SubSection title="Variants">
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="danger">Danger</Button>
                  <Button variant="ghost">Ghost</Button>
                </div>
              </SubSection>

              {/* Sizes */}
              <SubSection title="Sizes">
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="primary" size="sm">Small</Button>
                  <Button variant="primary" size="md">Medium</Button>
                  <Button variant="primary" size="lg">Large</Button>
                </div>
              </SubSection>

              {/* States */}
              <SubSection title="States">
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="primary" disabled>Disabled</Button>
                  <Button variant="primary" loading>Loading</Button>
                  <Button variant="primary" icon={<Plus size={16} />}>With Icon</Button>
                  <Button variant="secondary" icon={<Download size={16} />}>Download</Button>
                </div>
              </SubSection>

              {/* Full matrix */}
              <SubSection title="Full Matrix (Variant x Size)">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <th className="text-left py-2 pr-4 font-medium" style={{ color: 'var(--text-secondary)' }}>Variant</th>
                        <th className="text-left py-2 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>sm</th>
                        <th className="text-left py-2 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>md</th>
                        <th className="text-left py-2 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>lg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(['primary', 'secondary', 'danger', 'ghost'] as const).map((v) => (
                        <tr key={v} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td className="py-3 pr-4 font-medium capitalize" style={{ color: 'var(--text-primary)' }}>{v}</td>
                          {(['sm', 'md', 'lg'] as const).map((s) => (
                            <td key={s} className="py-3 px-4">
                              <Button variant={v} size={s}>{v}</Button>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SubSection>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* ============================================================== */}
      {/*  5. Badges                                                       */}
      {/* ============================================================== */}
      <Section title="5. Badges">
        <Card>
          <CardContent>
            <div className="space-y-6">
              <SubSection title="Variants">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="error">Error</Badge>
                  <Badge variant="info">Info</Badge>
                  <Badge variant="neutral">Neutral</Badge>
                </div>
              </SubSection>

              <SubSection title="Sizes">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="success" size="sm">Small</Badge>
                  <Badge variant="success" size="md">Medium</Badge>
                </div>
              </SubSection>

              <SubSection title="Use Cases">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="success">Active</Badge>
                  <Badge variant="warning">Expiring Soon</Badge>
                  <Badge variant="error">Expired</Badge>
                  <Badge variant="info">PROD</Badge>
                  <Badge variant="neutral">Draft</Badge>
                  <Badge variant="success">Healthy</Badge>
                  <Badge variant="warning">Degraded</Badge>
                  <Badge variant="error">Unhealthy</Badge>
                </div>
              </SubSection>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* ============================================================== */}
      {/*  6. Cards                                                        */}
      {/* ============================================================== */}
      <Section title="6. Cards">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Default Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Standard card with border and background. Uses <code className="font-mono text-xs">var(--bg-surface)</code>.
              </p>
            </CardContent>
          </Card>

          <Card hover>
            <CardHeader>
              <CardTitle>Hover Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Card with hover effect. Set <code className="font-mono text-xs">hover={'{true}'}</code> to enable border highlight on hover.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>KPI Card Example</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'ui-monospace, "JetBrains Mono", Consolas, monospace', lineHeight: '1.0' }}>
                84.2M
              </div>
              <p className="text-sm mt-2" style={{ color: 'var(--brand-main)' }}>
                Budget utilization 64%
              </p>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* ============================================================== */}
      {/*  7. Inputs                                                       */}
      {/* ============================================================== */}
      <Section title="7. Inputs">
        <Card>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Default Input" placeholder="Enter text..." />
              <Input label="With Helper" placeholder="ag-prod-xxxx" helperText="Key format: ag-{env}-{hex}" />
              <Input label="With Error" placeholder="Invalid value" error="This field is required" />
              <Input label="With Icon" placeholder="Search..." icon={<Search size={16} />} />
              <Input label="Disabled" placeholder="Cannot edit" disabled />
              <Input label="Password" type="password" placeholder="Enter password" />
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* ============================================================== */}
      {/*  8. Table                                                        */}
      {/* ============================================================== */}
      <Section title="8. Table">
        <Card>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>ID</th>
                    <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>Name</th>
                    <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>Environment</th>
                    <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>Status</th>
                    <th className="text-right py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>Usage</th>
                    <th className="text-right py-3 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td className="py-3 px-4">
                        <code className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{row.id}</code>
                      </td>
                      <td className="py-3 px-4 font-medium" style={{ color: 'var(--text-primary)' }}>{row.name}</td>
                      <td className="py-3 px-4">
                        <Badge variant={row.env === 'PROD' ? 'info' : row.env === 'STAGING' ? 'warning' : 'neutral'}>{row.env}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={row.status === 'active' ? 'success' : 'error'}>{row.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-mono" style={{ color: 'var(--text-primary)' }}>{row.usage}</td>
                      <td className="py-3 px-4 text-right font-mono" style={{ color: 'var(--text-secondary)' }}>{row.expires}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* ============================================================== */}
      {/*  9. Icons                                                        */}
      {/* ============================================================== */}
      <Section title="9. Icons (Lucide)">
        <Card>
          <CardContent>
            <div className="mb-4">
              <Input
                placeholder="Search icons..."
                value={iconSearch}
                onChange={(e) => setIconSearch(e.target.value)}
                icon={<Search size={16} />}
              />
            </div>
            <div className="space-y-6">
              {filteredIconSets.map((group) => (
                <div key={group.category}>
                  <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>{group.category}</h3>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                    {group.icons.map((item) => (
                      <div
                        key={item.name}
                        className="flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                        title={item.name}
                      >
                        {item.icon}
                        <span className="text-[10px] truncate w-full text-center" style={{ color: 'var(--text-muted)' }}>
                          {item.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {filteredIconSets.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  No icons match "{iconSearch}"
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* ============================================================== */}
      {/*  10. Design Tokens Summary                                       */}
      {/* ============================================================== */}
      <Section title="10. Design Tokens Summary">
        <Card>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th className="text-left py-2 pr-4 font-semibold" style={{ color: 'var(--text-primary)' }}>Token</th>
                    <th className="text-left py-2 px-4 font-semibold" style={{ color: 'var(--text-primary)' }}>CSS Variable</th>
                    <th className="text-left py-2 pl-4 font-semibold" style={{ color: 'var(--text-primary)' }}>Usage</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Background Body', 'var(--bg-body)', 'Page background'],
                    ['Background Surface', 'var(--bg-surface)', 'Card / panel background'],
                    ['Background Elevated', 'var(--bg-elevated)', 'Hover / active state background'],
                    ['Border', 'var(--border-color)', 'Card borders, dividers'],
                    ['Text Primary', 'var(--text-primary)', 'Headings, primary content'],
                    ['Text Secondary', 'var(--text-secondary)', 'Descriptions, labels'],
                    ['Text Muted', 'var(--text-muted)', 'Placeholder, disabled text'],
                    ['Brand Main', 'var(--brand-main)', 'Primary actions, success states'],
                    ['Brand Accent', 'var(--brand-accent)', 'Warnings, secondary emphasis'],
                    ['Border Radius', 'var(--border-radius-base)', 'Corner rounding for all components'],
                    ['Shadow Card', 'var(--shadow-card)', 'Card elevation'],
                    ['Backdrop Filter', 'var(--backdrop-filter)', 'Glassmorphism (Apple theme)'],
                  ].map(([name, token, usage]) => (
                    <tr key={token} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td className="py-2 pr-4 font-medium" style={{ color: 'var(--text-primary)' }}>{name}</td>
                      <td className="py-2 px-4">
                        <code className="text-xs font-mono px-2 py-0.5 rounded" style={{ color: 'var(--brand-main)', backgroundColor: 'var(--bg-elevated)' }}>
                          {token}
                        </code>
                      </td>
                      <td className="py-2 pl-4" style={{ color: 'var(--text-secondary)' }}>{usage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </Section>
    </div>
  )
}
