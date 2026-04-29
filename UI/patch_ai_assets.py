import os

BASE_DIR = r"d:\workspace\XYTX\AiGate\ui"

with open(os.path.join(BASE_DIR, "dashboard.html"), "r", encoding="utf-8") as f:
    sample = f.read()

head_end = sample.find("</head>") + 7
body_end = sample.find('<main class="flex-1')
tail_start = sample.find("</main>")
tail = sample[tail_start:]
HEAD = sample[:head_end]
NAV = sample[head_end:body_end]

def make_page(title, content):
    nav = NAV.replace('href="dashboard.html" class="nav-item active"', 'href="dashboard.html" class="nav-item"')
    html = HEAD + "\n<body>\n" + nav + '\n<main class="flex-1 overflow-y-auto p-6 lg:p-10 relative"><div class="max-w-7xl mx-auto">\n' + content + "\n</div></main>\n" + tail
    return html.replace("AiGate - 数据大盘", f"AiGate - {title}")

CARD_HEADER = lambda title, badge, btn_label, btn_id: f"""
<div class="flex items-center justify-between mb-8">
  <div><h1 class="text-3xl font-bold tracking-tight">{title}</h1>
    <p class="text-secondary mt-1">{badge}</p></div>
  <button class="btn-primary" id="{btn_id}">{btn_label}</button>
</div>"""

def asset_card(name, desc, tags, status="启用", call_count="1.2k", icon_path="M12 2L2 7l10 5 10-5-10-5M2 17l10 5 10-5M2 12l10 5 10-5"):
    badge_cls = "badge-success" if status == "启用" else "badge-warning"
    tags_html = "".join(f'<span class="badge border-gray-500 text-xs">{t}</span>' for t in tags)
    return f"""
<div class="card flex flex-col hover:-translate-y-1 transition-transform duration-200">
  <div class="flex items-start justify-between mb-3">
    <div class="w-12 h-12 rounded-xl border flex items-center justify-center" style="background:var(--bg-body);border-color:var(--border-color);color:var(--brand-main)">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="{icon_path}"/></svg>
    </div>
    <span class="badge {badge_cls}">{status}</span>
  </div>
  <h3 class="font-bold text-base mb-1">{name}</h3>
  <p class="text-secondary text-sm flex-1 mb-4">{desc}</p>
  <div class="flex flex-wrap gap-2 mb-4">{tags_html}</div>
  <div class="flex justify-between items-center border-t pt-4 mt-auto" style="border-color:var(--border-color)">
    <span class="text-xs text-secondary">近7天调用: <strong style="color:var(--text-primary)">{call_count}</strong></span>
    <div class="flex gap-3">
      <button class="text-xs font-bold text-secondary hover:text-primary">编辑</button>
      <button class="text-xs font-bold text-brand-main hover:underline">配置</button>
    </div>
  </div>
</div>"""

PAGES = {
"mcp.html": ("MCP 工具市场", CARD_HEADER("MCP 工具市场", "注册符合 Model Context Protocol 的工具，供 Agent 动态调用。", "+ 注册工具", "addMcpBtn") + """
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">""" +
  asset_card("GitHub API", "支持代码库搜索、Issue 管理、PR 审查等操作。", ["MCP:REMOTE", "认证:OAuth"], "启用", "1.2k", "M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4 M9 18c-4.51 2-5-2-7-2") +
  asset_card("飞书文档读写", "读取/写入飞书文档、电子表格、多维表格。", ["MCP:REMOTE", "认证:AppToken"], "启用", "856") +
  asset_card("数据库查询", "只读查询企业内部 PostgreSQL，用于数据统计辅助。", ["MCP:LOCAL", "只读"], "启用", "3.4k", "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z") +
  asset_card("邮件发送", "通过 SMTP 发送邮件，供 Agent 执行通知任务。", ["MCP:LOCAL", "SMTP"], "停用", "0") +
  """</div>"""),

"hooks.html": ("Hooks 钩子", CARD_HEADER("Hooks 事件钩子", "在 AI 调用流程中插入自定义处理逻辑，如日志记录、敏感词过滤、请求改写。", "+ 新建 Hook", "addHookBtn") + """
<div class="card p-0 overflow-hidden mb-6">
  <table class="w-full text-left">
    <thead class="border-b text-xs text-secondary uppercase tracking-wider" style="border-color:var(--border-color);background:rgba(0,0,0,0.05)">
      <tr>
        <th class="p-4">Hook 名称</th><th class="p-4">触发时机</th><th class="p-4">处理逻辑</th><th class="p-4">作用范围</th><th class="p-4">状态</th><th class="p-4 text-right">操作</th>
      </tr>
    </thead>
    <tbody class="text-sm divide-y" style="border-color:var(--border-color)">
      <tr class="hover:bg-black/5 dark:hover:bg-white/5">
        <td class="p-4 font-bold">敏感词过滤</td>
        <td class="p-4"><span class="badge border-gray-500">pre-request</span></td>
        <td class="p-4 text-secondary">检测 prompt 中的敏感关键词，命中则拒绝请求</td>
        <td class="p-4 text-secondary">全局</td>
        <td class="p-4"><span class="badge badge-success">启用</span></td>
        <td class="p-4 text-right"><button class="text-brand-main font-bold text-xs hover:underline">编辑</button></td>
      </tr>
      <tr class="hover:bg-black/5 dark:hover:bg-white/5">
        <td class="p-4 font-bold">请求日志增强</td>
        <td class="p-4"><span class="badge border-gray-500">post-response</span></td>
        <td class="p-4 text-secondary">将每次调用的完整 prompt+response 写入审计库</td>
        <td class="p-4 text-secondary">全局</td>
        <td class="p-4"><span class="badge badge-success">启用</span></td>
        <td class="p-4 text-right"><button class="text-brand-main font-bold text-xs hover:underline">编辑</button></td>
      </tr>
      <tr class="hover:bg-black/5 dark:hover:bg-white/5">
        <td class="p-4 font-bold">系统提示词注入</td>
        <td class="p-4"><span class="badge border-gray-500">pre-request</span></td>
        <td class="p-4 text-secondary">自动在 system message 中注入企业安全合规声明</td>
        <td class="p-4 text-secondary">研发中心</td>
        <td class="p-4"><span class="badge badge-warning">停用</span></td>
        <td class="p-4 text-right"><button class="text-brand-main font-bold text-xs hover:underline">编辑</button></td>
      </tr>
      <tr class="hover:bg-black/5 dark:hover:bg-white/5">
        <td class="p-4 font-bold">响应格式化</td>
        <td class="p-4"><span class="badge border-gray-500">post-response</span></td>
        <td class="p-4 text-secondary">将 Markdown 格式输出转为纯文本返回给特定 Key</td>
        <td class="p-4 text-secondary">ag-prod-c3d4</td>
        <td class="p-4"><span class="badge badge-success">启用</span></td>
        <td class="p-4 text-right"><button class="text-brand-main font-bold text-xs hover:underline">编辑</button></td>
      </tr>
    </tbody>
  </table>
</div>"""),

"plugins.html": ("插件市场", CARD_HEADER("插件市场", "扩展 Agent 能力的功能插件，可独立安装启用，无需修改代码。", "+ 安装插件", "addPluginBtn") + """
<div class="flex gap-2 mb-6 flex-wrap">
  <button class="btn-primary text-sm py-1.5 px-4">全部</button>
  <button class="btn-secondary text-sm py-1.5 px-4">已安装</button>
  <button class="btn-secondary text-sm py-1.5 px-4">数据处理</button>
  <button class="btn-secondary text-sm py-1.5 px-4">通知推送</button>
  <button class="btn-secondary text-sm py-1.5 px-4">代码工具</button>
</div>
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">""" +
  asset_card("代码执行沙箱", "安全运行 Python/JS 代码片段，返回执行结果给 Agent。", ["代码工具", "已安装"], "启用", "420", "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4") +
  asset_card("网页爬虫", "根据 URL 抓取并解析网页内容，供 Agent 参考引用。", ["数据处理", "已安装"], "启用", "238", "M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9") +
  asset_card("钉钉通知", "将 Agent 执行结果推送到钉钉群消息或个人工作通知。", ["通知推送", "未安装"], "停用", "0", "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0") +
  asset_card("CSV 数据分析", "解析上传的 CSV 文件并生成统计报告与图表描述。", ["数据处理", "已安装"], "启用", "156", "M3 3v18h18 M18 17V9 M13 17V5 M8 17v-3") +
  """</div>"""),

"skills.html": ("Skills 技能库", CARD_HEADER("Skills 技能库", "可复用的提示词模板与任务技能，可直接绑定到 Agent 使用。", "+ 创建技能", "addSkillBtn") + """
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">""" +
  asset_card("代码审查", "根据企业编码规范对代码进行逐行 Review，输出结构化评审意见。", ["内置", "代码"], "启用", "892", "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22") +
  asset_card("会议纪要整理", "将原始会议录音文字转化为结构化纪要，含决议事项与 Action Items。", ["内置", "文档"], "启用", "345") +
  asset_card("需求拆解", "将产品需求描述拆解为研发可执行的用户故事和验收标准。", ["内置", "产品"], "启用", "218", "M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11") +
  asset_card("SQL 生成", "根据自然语言描述生成 PostgreSQL 查询语句并解释执行计划。", ["自定义", "数据"], "启用", "560", "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z") +
  asset_card("周报生成", "根据本周工作日志与任务列表自动生成周报初稿。", ["自定义", "文档"], "停用", "0") +
  """</div>"""),

"agent.html": ("Agent 体系", CARD_HEADER("Agent 引擎", "基于 LangGraph 编排智能体工作流，绑定知识库、MCP 工具与 Skills 技能。", "+ 编排 Agent", "addAgentBtn") + """
<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
  <div class="card" style="border-color:var(--brand-main);background:color-mix(in srgb,var(--brand-main) 5%,var(--bg-surface))">
    <div class="flex items-start justify-between mb-4">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl border-2 flex items-center justify-center" style="background:var(--bg-body);border-color:var(--brand-main);color:var(--brand-main)">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
        </div>
        <div>
          <h2 class="text-xl font-bold flex items-center gap-2">AiGate Bot <span class="px-2 py-0.5 text-xs uppercase font-black rounded" style="background:var(--brand-main);color:var(--bg-body)">内置</span></h2>
          <p class="text-xs text-secondary mt-1">系统级管理助手，查询配额、日志与组织数据。</p>
        </div>
      </div>
      <span class="badge badge-success">运行中</span>
    </div>
    <div class="flex flex-wrap gap-2 mb-4">
      <span class="badge border-gray-500">技能: SQL生成</span>
      <span class="badge border-gray-500">知识库: 全局</span>
      <span class="badge border-gray-500">记忆: 开启</span>
    </div>
    <div class="flex gap-2">
      <button class="btn-primary flex-1 text-sm py-2" onclick="window.location.href='#'">对话体验</button>
      <a href="logs.html" class="btn-secondary text-sm py-2 px-4">查看日志</a>
    </div>
  </div>

  <div class="card border-l-4" style="border-left-color:var(--brand-accent)">
    <div class="flex items-start justify-between mb-4">
      <div>
        <h3 class="text-lg font-bold">代码审查助手</h3>
        <p class="text-sm text-secondary mt-1">抓取 GitLab MR，结合规范手册生成评审意见。</p>
      </div>
      <span class="badge badge-success">运行中</span>
    </div>
    <div class="flex flex-wrap gap-2 mb-4">
      <span class="badge border-gray-500">MCP: GitLab</span>
      <span class="badge border-gray-500">技能: 代码审查</span>
      <span class="badge border-gray-500">知识库: 研发规章</span>
    </div>
    <div class="flex gap-2">
      <button class="btn-secondary flex-1 text-sm py-2">调试</button>
      <a href="logs.html" class="btn-secondary text-sm py-2 px-4">对话日志</a>
    </div>
  </div>

  <div class="card border-l-4" style="border-left-color:var(--border-color)">
    <div class="flex items-start justify-between mb-4">
      <div>
        <h3 class="text-lg font-bold">需求拆解助手</h3>
        <p class="text-sm text-secondary mt-1">将 PRD 文档自动拆解为用户故事与研发任务。</p>
      </div>
      <span class="badge badge-warning">草稿</span>
    </div>
    <div class="flex flex-wrap gap-2 mb-4">
      <span class="badge border-gray-500">技能: 需求拆解</span>
      <span class="badge border-gray-500">知识库: 产品设计文档</span>
    </div>
    <div class="flex gap-2">
      <button class="btn-primary flex-1 text-sm py-2">发布</button>
      <button class="btn-secondary text-sm py-2 px-4">编辑</button>
    </div>
  </div>

  <div class="card flex items-center justify-center border-dashed" style="border-color:var(--border-color);min-height:160px;cursor:pointer;" onmouseenter="this.style.borderColor='var(--brand-main)'" onmouseleave="this.style.borderColor='var(--border-color)'">
    <div class="text-center text-secondary">
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-3"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
      <div class="font-bold">编排新 Agent</div>
      <div class="text-xs mt-1">组合 Skills + MCP + 知识库</div>
    </div>
  </div>
</div>

<div class="card p-0 overflow-hidden">
  <div class="p-4 border-b font-bold flex justify-between items-center" style="border-color:var(--border-color)">
    <span>最近 Agent 对话日志</span>
    <a href="logs.html" class="text-xs text-brand-main font-bold hover:underline">查看全部</a>
  </div>
  <table class="w-full text-left">
    <thead class="border-b text-xs text-secondary uppercase tracking-wider" style="border-color:var(--border-color);background:rgba(0,0,0,0.05)">
      <tr><th class="p-4">时间</th><th class="p-4">用户</th><th class="p-4">Agent</th><th class="p-4">调用知识库</th><th class="p-4">工具调用</th><th class="p-4">Tokens</th><th class="p-4 text-right">状态</th></tr>
    </thead>
    <tbody class="text-sm divide-y" style="border-color:var(--border-color)">
      <tr class="hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer">
        <td class="p-4 text-secondary">2026-04-29 14:05</td><td class="p-4">张三</td>
        <td class="p-4 text-brand-main font-bold">AiGate Bot</td>
        <td class="p-4 text-secondary">SLA 运维手册</td>
        <td class="p-4 font-mono">3 次</td><td class="p-4 font-mono">2,480</td>
        <td class="p-4 text-right"><span class="badge badge-success">完成</span></td>
      </tr>
      <tr class="hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer">
        <td class="p-4 text-secondary">2026-04-29 13:40</td><td class="p-4">李四</td>
        <td class="p-4 font-bold">代码审查助手</td>
        <td class="p-4 text-secondary">研发规章手册</td>
        <td class="p-4 font-mono">7 次</td><td class="p-4 font-mono">5,120</td>
        <td class="p-4 text-right"><span class="badge badge-success">完成</span></td>
      </tr>
      <tr class="hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer">
        <td class="p-4 text-secondary">2026-04-29 11:22</td><td class="p-4">王五</td>
        <td class="p-4 font-bold">代码审查助手</td>
        <td class="p-4 text-secondary">-</td>
        <td class="p-4 font-mono">2 次</td><td class="p-4 font-mono">890</td>
        <td class="p-4 text-right"><span class="badge badge-warning">超时</span></td>
      </tr>
    </tbody>
  </table>
</div>"""),
}

for filename, (title, content) in PAGES.items():
    html = make_page(title, content)
    with open(os.path.join(BASE_DIR, filename), "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Generated {filename}")

# --- 更新 generate_pages.py 侧边栏：AI 资产分组加入 hooks/plugins/skills ---
gp = os.path.join(BASE_DIR, "generate_pages.py")
with open(gp, "r", encoding="utf-8") as f:
    gp_content = f.read()

old_ai_assets_nav = """{nav_knowledge}
                    <div data-roles="sys_admin">{nav_mcp}</div>
                    {nav_agent}"""

new_ai_assets_nav = """<div data-roles="sys_admin,tenant_admin">{nav_knowledge}</div>
                    {nav_mcp}
                    {nav_hooks}
                    {nav_plugins}
                    {nav_skills}
                    {nav_agent}"""

if old_ai_assets_nav in gp_content:
    gp_content = gp_content.replace(old_ai_assets_nav, new_ai_assets_nav)
    with open(gp, "w", encoding="utf-8") as f:
        f.write(gp_content)
    print("Updated generate_pages.py sidebar nav")
else:
    print("WARN: Could not find AI assets nav block in generate_pages.py, please update manually")

print("Done!")
