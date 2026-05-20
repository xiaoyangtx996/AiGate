# 国际化（i18n）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 AiGate 前端添加中英日三语国际化支持

**Architecture:** 使用 i18next + react-i18next 实现国际化，翻译文件按页面拆分，语言选择持久化到 localStorage

**Tech Stack:** i18next, react-i18next, i18next-browser-languagedetector

---

## 文件结构

```
AiGate-front/src/
├── i18n/
│   └── index.ts              # i18n 配置
├── locales/
│   ├── zh/                   # 中文翻译
│   │   ├── common.json
│   │   ├── nav.json
│   │   └── ... (26 个页面文件)
│   ├── en/                   # 英文翻译
│   └── ja/                   # 日文翻译
├── components/
│   └── layout/
│       └── LanguageSwitcher.tsx  # 语言切换组件
└── pages/                    # 改造现有页面
```

---

## Task 1: 安装依赖和配置 i18n

**Files:**
- Modify: `AiGate-front/package.json`
- Create: `AiGate-front/src/i18n/index.ts`
- Modify: `AiGate-front/src/main.tsx`

- [ ] **Step 1: 安装依赖**

```bash
cd AiGate-front && npm install i18next react-i18next i18next-browser-languagedetector
```

- [ ] **Step 2: 创建 i18n 配置文件**

```typescript
// AiGate-front/src/i18n/index.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import zhCommon from '@/locales/zh/common.json'
import zhNav from '@/locales/zh/nav.json'
import zhDashboard from '@/locales/zh/dashboard.json'
// ... 其他中文翻译

import enCommon from '@/locales/en/common.json'
import enNav from '@/locales/en/nav.json'
import enDashboard from '@/locales/en/dashboard.json'
// ... 其他英文翻译

import jaCommon from '@/locales/ja/common.json'
import jaNav from '@/locales/ja/nav.json'
import jaDashboard from '@/locales/ja/dashboard.json'
// ... 其他日文翻译

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      zh: {
        common: zhCommon,
        nav: zhNav,
        dashboard: zhDashboard,
        // ... 其他
      },
      en: {
        common: enCommon,
        nav: enNav,
        dashboard: enDashboard,
        // ... 其他
      },
      ja: {
        common: jaCommon,
        nav: jaNav,
        dashboard: jaDashboard,
        // ... 其他
      },
    },
    fallbackLng: 'zh',
    ns: ['common', 'nav', 'dashboard'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

export default i18n
```

- [ ] **Step 3: 在 main.tsx 中初始化 i18n**

```typescript
// AiGate-front/src/main.tsx
import './i18n'  // 添加这行
import React from 'react'
// ... 其他导入
```

- [ ] **Step 4: 验证配置**

运行 `npm run dev` 确保无错误

- [ ] **Step 5: 提交**

```bash
git add AiGate-front/package.json AiGate-front/src/i18n/ AiGate-front/src/main.tsx
git commit -m "feat: 安装 i18next 依赖并配置国际化框架"
```

---

## Task 2: 创建中文翻译文件（通用 + 导航）

**Files:**
- Create: `AiGate-front/src/locales/zh/common.json`
- Create: `AiGate-front/src/locales/zh/nav.json`

- [ ] **Step 1: 创建 common.json**

```json
{
  "common": {
    "button": {
      "save": "保存",
      "cancel": "取消",
      "confirm": "确认",
      "delete": "删除",
      "edit": "编辑",
      "create": "创建",
      "search": "搜索",
      "filter": "筛选",
      "export": "导出",
      "import": "导入",
      "refresh": "刷新",
      "submit": "提交",
      "back": "返回",
      "next": "下一步",
      "prev": "上一步",
      "close": "关闭",
      "copy": "复制",
      "reset": "重置"
    },
    "status": {
      "active": "正常",
      "disabled": "已停用",
      "expired": "已过期",
      "revoked": "已吊销",
      "pending": "待处理",
      "processing": "处理中",
      "resolved": "已解决",
      "success": "成功",
      "error": "失败",
      "loading": "加载中..."
    },
    "placeholder": {
      "search": "搜索...",
      "select": "请选择",
      "input": "请输入",
      "noData": "暂无数据",
      "noResult": "未找到匹配项"
    },
    "message": {
      "saveSuccess": "保存成功",
      "deleteSuccess": "删除成功",
      "createSuccess": "创建成功",
      "updateSuccess": "更新成功",
      "copySuccess": "复制成功",
      "operationSuccess": "操作成功",
      "confirmDelete": "确认删除？",
      "confirmAction": "确认执行此操作？"
    },
    "time": {
      "justNow": "刚刚",
      "minutesAgo": "{{count}} 分钟前",
      "hoursAgo": "{{count}} 小时前",
      "daysAgo": "{{count}} 天前",
      "today": "今天",
      "yesterday": "昨天",
      "thisWeek": "本周",
      "thisMonth": "本月"
    }
  }
}
```

- [ ] **Step 2: 创建 nav.json**

```json
{
  "nav": {
    "dataCenter": "数据中心",
    "dashboard": "数据大盘",
    "workspace": "我的工作台",
    "orgGovernance": "组织治理",
    "organization": "组织与配额",
    "users": "用户管理",
    "quotaApproval": "配额申请审批",
    "subscription": "套餐与计费",
    "gateway": "网关与接入",
    "channels": "渠道管理",
    "models": "模型资产",
    "keys": "密钥管理",
    "logs": "调用日志",
    "billing": "消耗报表",
    "knowledge": "知识库",
    "assets": "AI 资产市场",
    "prompts": "提示词库",
    "mcp": "MCP 工具",
    "skills": "Skills 技能库",
    "plugins": "Plugins 插件库",
    "hooks": "Hooks 钩子库",
    "agent": "Agent 中心",
    "monitoring": "监控与合规",
    "alerts": "预警中心",
    "audit": "操作审计",
    "system": "系统",
    "settings": "系统设置",
    "status": "系统状态",
    "developer": "开发者中心"
  }
}
```

- [ ] **Step 3: 提交**

```bash
git add AiGate-front/src/locales/zh/
git commit -m "feat: 添加中文翻译文件（通用 + 导航）"
```

---

## Task 3: 创建英文翻译文件（通用 + 导航）

**Files:**
- Create: `AiGate-front/src/locales/en/common.json`
- Create: `AiGate-front/src/locales/en/nav.json`

- [ ] **Step 1: 创建 common.json**

```json
{
  "common": {
    "button": {
      "save": "Save",
      "cancel": "Cancel",
      "confirm": "Confirm",
      "delete": "Delete",
      "edit": "Edit",
      "create": "Create",
      "search": "Search",
      "filter": "Filter",
      "export": "Export",
      "import": "Import",
      "refresh": "Refresh",
      "submit": "Submit",
      "back": "Back",
      "next": "Next",
      "prev": "Previous",
      "close": "Close",
      "copy": "Copy",
      "reset": "Reset"
    },
    "status": {
      "active": "Active",
      "disabled": "Disabled",
      "expired": "Expired",
      "revoked": "Revoked",
      "pending": "Pending",
      "processing": "Processing",
      "resolved": "Resolved",
      "success": "Success",
      "error": "Error",
      "loading": "Loading..."
    },
    "placeholder": {
      "search": "Search...",
      "select": "Please select",
      "input": "Please input",
      "noData": "No data",
      "noResult": "No results found"
    },
    "message": {
      "saveSuccess": "Saved successfully",
      "deleteSuccess": "Deleted successfully",
      "createSuccess": "Created successfully",
      "updateSuccess": "Updated successfully",
      "copySuccess": "Copied successfully",
      "operationSuccess": "Operation successful",
      "confirmDelete": "Confirm delete?",
      "confirmAction": "Confirm this action?"
    },
    "time": {
      "justNow": "Just now",
      "minutesAgo": "{{count}} minutes ago",
      "hoursAgo": "{{count}} hours ago",
      "daysAgo": "{{count}} days ago",
      "today": "Today",
      "yesterday": "Yesterday",
      "thisWeek": "This week",
      "thisMonth": "This month"
    }
  }
}
```

- [ ] **Step 2: 创建 nav.json**

```json
{
  "nav": {
    "dataCenter": "Data Center",
    "dashboard": "Dashboard",
    "workspace": "My Workspace",
    "orgGovernance": "Organization",
    "organization": "Organization & Quota",
    "users": "User Management",
    "quotaApproval": "Quota Approval",
    "subscription": "Subscription",
    "gateway": "Gateway",
    "channels": "Channels",
    "models": "Model Assets",
    "keys": "API Keys",
    "logs": "Call Logs",
    "billing": "Billing Reports",
    "knowledge": "Knowledge Base",
    "assets": "AI Asset Market",
    "prompts": "Prompt Library",
    "mcp": "MCP Tools",
    "skills": "Skills Library",
    "plugins": "Plugins Library",
    "hooks": "Hooks Library",
    "agent": "Agent Center",
    "monitoring": "Monitoring",
    "alerts": "Alert Center",
    "audit": "Audit Logs",
    "system": "System",
    "settings": "Settings",
    "status": "System Status",
    "developer": "Developer Center"
  }
}
```

- [ ] **Step 3: 提交**

```bash
git add AiGate-front/src/locales/en/
git commit -m "feat: 添加英文翻译文件（通用 + 导航）"
```

---

## Task 4: 创建日文翻译文件（通用 + 导航）

**Files:**
- Create: `AiGate-front/src/locales/ja/common.json`
- Create: `AiGate-front/src/locales/ja/nav.json`

- [ ] **Step 1: 创建 common.json**

```json
{
  "common": {
    "button": {
      "save": "保存",
      "cancel": "キャンセル",
      "confirm": "確認",
      "delete": "削除",
      "edit": "編集",
      "create": "作成",
      "search": "検索",
      "filter": "フィルター",
      "export": "エクスポート",
      "import": "インポート",
      "refresh": "更新",
      "submit": "送信",
      "back": "戻る",
      "next": "次へ",
      "prev": "前へ",
      "close": "閉じる",
      "copy": "コピー",
      "reset": "リセット"
    },
    "status": {
      "active": "有効",
      "disabled": "無効",
      "expired": "期限切れ",
      "revoked": "取り消し",
      "pending": "保留中",
      "processing": "処理中",
      "resolved": "解決済み",
      "success": "成功",
      "error": "エラー",
      "loading": "読み込み中..."
    },
    "placeholder": {
      "search": "検索...",
      "select": "選択してください",
      "input": "入力してください",
      "noData": "データなし",
      "noResult": "結果が見つかりません"
    },
    "message": {
      "saveSuccess": "保存しました",
      "deleteSuccess": "削除しました",
      "createSuccess": "作成しました",
      "updateSuccess": "更新しました",
      "copySuccess": "コピーしました",
      "operationSuccess": "操作が成功しました",
      "confirmDelete": "削除しますか？",
      "confirmAction": "この操作を実行しますか？"
    },
    "time": {
      "justNow": "たった今",
      "minutesAgo": "{{count}}分前",
      "hoursAgo": "{{count}}時間前",
      "daysAgo": "{{count}}日前",
      "today": "今日",
      "yesterday": "昨日",
      "thisWeek": "今週",
      "thisMonth": "今月"
    }
  }
}
```

- [ ] **Step 2: 创建 nav.json**

```json
{
  "nav": {
    "dataCenter": "データセンター",
    "dashboard": "ダッシュボード",
    "workspace": "マイワークスペース",
    "orgGovernance": "組織管理",
    "organization": "組織とクォータ",
    "users": "ユーザー管理",
    "quotaApproval": "クォータ承認",
    "subscription": "サブスクリプション",
    "gateway": "ゲートウェイ",
    "channels": "チャンネル",
    "models": "モデルアセット",
    "keys": "APIキー",
    "logs": "コールログ",
    "billing": "請求レポート",
    "knowledge": "ナレッジベース",
    "assets": "AIアセットマーケット",
    "prompts": "プロンプトライブラリ",
    "mcp": "MCPツール",
    "skills": "スキルライブラリ",
    "plugins": "プラグインライブラリ",
    "hooks": "フックライブラリ",
    "agent": "エージェントセンター",
    "monitoring": "モニタリング",
    "alerts": "アラートセンター",
    "audit": "監査ログ",
    "system": "システム",
    "settings": "設定",
    "status": "システムステータス",
    "developer": "開発者センター"
  }
}
```

- [ ] **Step 3: 提交**

```bash
git add AiGate-front/src/locales/ja/
git commit -m "feat: 添加日文翻译文件（通用 + 导航）"
```

---

## Task 5: 创建语言切换组件

**Files:**
- Create: `AiGate-front/src/components/layout/LanguageSwitcher.tsx`
- Modify: `AiGate-front/src/components/layout/MasterNav.tsx`

- [ ] **Step 1: 创建 LanguageSwitcher 组件**

```typescript
// AiGate-front/src/components/layout/LanguageSwitcher.tsx
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'

const languages = [
  { code: 'zh', name: '中文（简体）' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
]

export function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0]

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code)
    localStorage.setItem('aigate_language', code)
  }

  return (
    <div className="flex items-center gap-2">
      <Globe size={16} className="text-secondary" />
      <select
        className="bg-transparent border-none outline-none cursor-pointer text-sm font-bold"
        value={i18n.language}
        onChange={(e) => handleLanguageChange(e.target.value)}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  )
}
```

- [ ] **Step 2: 集成到 MasterNav**

修改 `MasterNav.tsx`，在顶栏添加语言切换组件

- [ ] **Step 3: 验证**

运行 `npm run dev` 测试语言切换

- [ ] **Step 4: 提交**

```bash
git add AiGate-front/src/components/layout/LanguageSwitcher.tsx AiGate-front/src/components/layout/MasterNav.tsx
git commit -m "feat: 添加语言切换组件并集成到顶栏"
```

---

## Task 6: 改造 Sidebar 使用国际化

**Files:**
- Modify: `AiGate-front/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: 修改 Sidebar 使用 useTranslation**

```typescript
import { useTranslation } from 'react-i18next'

// 在组件中
const { t } = useTranslation('nav')

// 使用翻译
{ label: t('nav.dashboard'), path: '/dashboard', ... }
```

- [ ] **Step 2: 验证**

切换语言后导航菜单文案变化

- [ ] **Step 3: 提交**

```bash
git add AiGate-front/src/components/layout/Sidebar.tsx
git commit -m "feat: Sidebar 导航菜单国际化"
```

---

## Task 7: 创建页面级翻译文件并改造页面（批次 1）

**Files:**
- Create: `AiGate-front/src/locales/zh/dashboard.json`
- Create: `AiGate-front/src/locales/en/dashboard.json`
- Create: `AiGate-front/src/locales/ja/dashboard.json`
- Modify: `AiGate-front/src/pages/Dashboard.tsx`

- [ ] **Step 1: 创建 dashboard.json 翻译文件**

包含数据大盘页面的所有文案

- [ ] **Step 2: 修改 Dashboard.tsx 使用 useTranslation**

- [ ] **Step 3: 验证**

- [ ] **Step 4: 提交**

```bash
git add AiGate-front/src/locales/ AiGate-front/src/pages/Dashboard.tsx
git commit -m "feat: Dashboard 页面国际化"
```

---

## Task 8-20: 改造其他页面

重复 Task 7 的模式，为每个页面创建翻译文件并改造组件：

- Task 8: Login 页面
- Task 9: Users 页面
- Task 10: Keys 页面
- Task 11: Logs 页面
- Task 12: Alerts 页面
- Task 13: Knowledge 页面
- Task 14: MCP 页面
- Task 15: Agent 页面
- Task 16: Prompts 页面
- Task 17: Settings 页面
- Task 18: Profile 页面
- Task 19: 其他页面（Skills, Plugins, Hooks 等）
- Task 20: 错误页面

---

## Task 21: 最终验证

- [ ] **Step 1: 运行构建**

```bash
cd AiGate-front && npm run build
```

- [ ] **Step 2: 测试三语言切换**

访问 http://localhost:3000，测试中英日切换

- [ ] **Step 3: 提交最终版本**

```bash
git add -A
git commit -m "feat: 完成全部页面国际化（中英日三语）"
```

---

**计划完成，保存到 `docs/superpowers/plans/2026-05-21-i18n-implementation.md`**

**两种执行方式：**

**1. Subagent-Driven（推荐）** - 每个任务分发一个独立子代理执行

**2. Inline Execution** - 在当前会话中批量执行

选择哪种方式？
