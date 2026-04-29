import os, re

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

PAGES = {
"knowledge.html": ("知识库管理", """
<div class="flex items-center justify-between mb-6">
  <div><h1 class="text-3xl font-bold tracking-tight">知识库管理</h1>
    <p class="text-secondary mt-1">企业文档文件管理系统，支持文件夹分类、开放/锁定权限控制与 RAG 检索策略配置。</p></div>
  <div class="flex gap-2">
    <button class="btn-secondary" data-roles="sys_admin,tenant_admin">RAG 策略配置</button>
    <button class="btn-primary">新建文件夹</button>
  </div>
</div>
<div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
  <div class="col-span-1 card p-0 overflow-hidden">
    <div class="p-4 border-b font-bold text-sm flex justify-between items-center" style="border-color:var(--border-color)">
      <span>文件夹目录</span>
      <button class="text-xs text-brand-main font-bold hover:underline">+ 新建</button>
    </div>
    <div class="p-2">
      <div class="nav-item active rounded-lg py-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>全部文件</div>
      <div class="pl-4 space-y-0.5 mt-1">
        <div class="nav-item rounded-lg py-2 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span>研发规章手册</span>
          <span class="ml-auto text-xs text-brand-accent">锁定</span>
        </div>
        <div class="nav-item rounded-lg py-2 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          <span>产品设计文档</span>
          <span class="ml-auto text-xs text-brand-main">开放</span>
        </div>
        <div class="nav-item rounded-lg py-2 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          <span>SLA 运维手册</span>
          <span class="ml-auto text-xs text-brand-main">开放</span>
        </div>
        <div class="nav-item rounded-lg py-2 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span>财务归档</span>
          <span class="ml-auto text-xs text-brand-accent">锁定</span>
        </div>
      </div>
    </div>
  </div>

  <div class="col-span-3 space-y-4">
    <div class="card p-4 flex flex-wrap items-center gap-4 border-l-4" style="border-left-color:var(--brand-main);background:color-mix(in srgb,var(--brand-main) 5%,var(--bg-surface))">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-brand-main shrink-0"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input class="input-base flex-1 min-w-48" placeholder="在当前文件夹中搜索文件名...">
      <button class="btn-secondary text-sm">上传文档</button>
    </div>

    <div class="card p-0 overflow-hidden">
      <div class="p-4 border-b flex justify-between items-center" style="border-color:var(--border-color)">
        <div class="flex items-center gap-3">
          <span class="font-bold">产品设计文档</span>
          <span class="badge badge-success">开放 · AI 可读</span>
        </div>
        <div class="flex gap-2" data-roles="sys_admin,tenant_admin">
          <button class="btn-secondary text-xs py-1 px-3" onclick="this.innerText=this.innerText==='锁定文件夹'?'开放文件夹':'锁定文件夹'">锁定文件夹</button>
          <button class="btn-secondary text-xs py-1 px-3">RAG 策略</button>
        </div>
      </div>
      <table class="w-full text-left">
        <thead class="border-b text-xs text-secondary uppercase tracking-wider" style="border-color:var(--border-color);background:rgba(0,0,0,0.05)">
          <tr>
            <th class="p-3 pl-4">文件名</th>
            <th class="p-3">大小</th>
            <th class="p-3">向量状态</th>
            <th class="p-3">更新时间</th>
            <th class="p-3">上传者</th>
            <th class="p-3 text-right pr-4">操作</th>
          </tr>
        </thead>
        <tbody class="text-sm divide-y" style="border-color:var(--border-color)">
          <tr class="hover:bg-black/5 dark:hover:bg-white/5">
            <td class="p-3 pl-4"><div class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-brand-main"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span class="font-medium">AiGate_产品需求文档_v2.0.pdf</span></div></td>
            <td class="p-3 text-secondary">2.4 MB</td>
            <td class="p-3"><span class="badge badge-success">已向量化</span></td>
            <td class="p-3 text-secondary">2026-04-28</td>
            <td class="p-3 text-secondary">张三</td>
            <td class="p-3 text-right pr-4"><button class="text-brand-main font-bold text-xs hover:underline mr-2">下载</button><button class="text-brand-accent font-bold text-xs hover:underline">删除</button></td>
          </tr>
          <tr class="hover:bg-black/5 dark:hover:bg-white/5">
            <td class="p-3 pl-4"><div class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-brand-accent"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span class="font-medium">UI_设计规范_2026.docx</span></div></td>
            <td class="p-3 text-secondary">890 KB</td>
            <td class="p-3"><span class="badge badge-warning">处理中...</span></td>
            <td class="p-3 text-secondary">2026-04-29</td>
            <td class="p-3 text-secondary">李四</td>
            <td class="p-3 text-right pr-4"><button class="text-brand-main font-bold text-xs hover:underline mr-2">下载</button><button class="text-brand-accent font-bold text-xs hover:underline">删除</button></td>
          </tr>
          <tr class="hover:bg-black/5 dark:hover:bg-white/5">
            <td class="p-3 pl-4"><div class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span class="font-medium">竞品分析_2026Q1.xlsx</span></div></td>
            <td class="p-3 text-secondary">1.1 MB</td>
            <td class="p-3"><span class="badge badge-success">已向量化</span></td>
            <td class="p-3 text-secondary">2026-04-20</td>
            <td class="p-3 text-secondary">王五</td>
            <td class="p-3 text-right pr-4"><button class="text-brand-main font-bold text-xs hover:underline mr-2">下载</button><button class="text-brand-accent font-bold text-xs hover:underline">删除</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card" data-roles="sys_admin,tenant_admin">
      <h3 class="font-bold mb-4 flex items-center gap-2">RAG 检索策略配置 <span class="badge badge-success">当前文件夹生效</span></h3>
      <div class="grid grid-cols-2 gap-6">
        <div class="space-y-4">
          <div><label class="text-xs font-bold text-secondary uppercase tracking-widest block mb-1">分块策略</label>
            <select class="input-base"><option>512 Tokens (Overlap: 50)</option><option>1024 Tokens (Overlap: 100)</option><option>句子级分块</option></select></div>
          <div><label class="text-xs font-bold text-secondary uppercase tracking-widest block mb-1">嵌入模型</label>
            <select class="input-base"><option>text-embedding-3-large</option><option>bge-m3</option></select></div>
        </div>
        <div class="space-y-4">
          <div><label class="text-xs font-bold text-secondary uppercase tracking-widest block mb-1">召回策略</label>
            <select class="input-base"><option>混合检索 (向量 + BM25)</option><option>纯向量检索</option></select></div>
          <div><label class="text-xs font-bold text-secondary uppercase tracking-widest block mb-1">Rerank 模型</label>
            <select class="input-base"><option>bge-reranker-large</option><option>不启用</option></select></div>
          <div><label class="text-xs font-bold text-secondary uppercase tracking-widest block mb-1">Top-K 召回数</label>
            <input type="number" class="input-base" value="5"></div>
        </div>
      </div>
      <button class="btn-primary mt-4">保存策略</button>
    </div>
  </div>
</div>
"""),

"logs.html": ("调用日志", """
<div class="flex items-center justify-between mb-6">
  <div><h1 class="text-3xl font-bold tracking-tight">调用日志</h1>
    <p class="text-secondary mt-1">全量 AI 调用追踪，涵盖对话、生图、生视频及 Agent 对话日志。</p></div>
  <button class="btn-primary">导出 CSV</button>
</div>

<div class="flex gap-1 mb-6 border-b" style="border-color:var(--border-color)">
  <button onclick="switchTab(this,'tab-chat')" class="log-tab-btn px-5 py-3 text-sm font-bold border-b-2 transition-colors" style="border-color:var(--brand-main);color:var(--brand-main)">对话日志</button>
  <button onclick="switchTab(this,'tab-image')" class="log-tab-btn px-5 py-3 text-sm font-bold border-b-2 border-transparent text-secondary hover:text-primary transition-colors">生图日志</button>
  <button onclick="switchTab(this,'tab-video')" class="log-tab-btn px-5 py-3 text-sm font-bold border-b-2 border-transparent text-secondary hover:text-primary transition-colors">生视频日志</button>
  <button onclick="switchTab(this,'tab-agent')" class="log-tab-btn px-5 py-3 text-sm font-bold border-b-2 border-transparent text-secondary hover:text-primary transition-colors">Agent 对话</button>
</div>

<div class="card mb-4 flex flex-wrap gap-4 items-end" style="background:rgba(0,0,0,0.05)">
  <div class="space-y-1 flex-1 min-w-36"><label class="text-xs font-bold text-secondary uppercase tracking-widest">时间范围</label>
    <select class="input-base"><option>最近 24 小时</option><option>最近 7 天</option><option>本月</option></select></div>
  <div class="space-y-1 flex-1 min-w-36"><label class="text-xs font-bold text-secondary uppercase tracking-widest">调用 Key</label>
    <input class="input-base" placeholder="ag-..."></div>
  <div class="space-y-1 flex-1 min-w-36"><label class="text-xs font-bold text-secondary uppercase tracking-widest">模型</label>
    <select class="input-base"><option>全部</option><option>gpt-4o</option><option>claude-3-5-sonnet</option><option>dall-e-3</option></select></div>
  <button class="btn-secondary">查询</button>
</div>

<div id="tab-chat" class="log-tab">
  <div class="card p-0 overflow-hidden">
    <table class="w-full text-left">
      <thead class="border-b text-xs text-secondary uppercase tracking-wider" style="border-color:var(--border-color);background:rgba(0,0,0,0.05)">
        <tr><th class="p-4">时间</th><th class="p-4">Key</th><th class="p-4">模型</th><th class="p-4">提示词 Tokens</th><th class="p-4">输出 Tokens</th><th class="p-4">耗时</th><th class="p-4 text-right">状态</th></tr>
      </thead>
      <tbody class="text-sm divide-y" style="border-color:var(--border-color)">
        <tr class="hover:bg-black/5 dark:hover:bg-white/5"><td class="p-4 text-secondary">2026-04-29 13:12</td><td class="p-4 font-mono text-brand-main">ag-rd-a8f2</td><td class="p-4">gpt-4o</td><td class="p-4 font-mono">845</td><td class="p-4 font-mono">400</td><td class="p-4 text-secondary">1.2s</td><td class="p-4 text-right"><span class="badge badge-success">200</span></td></tr>
        <tr class="hover:bg-black/5 dark:hover:bg-white/5"><td class="p-4 text-secondary">2026-04-29 13:10</td><td class="p-4 font-mono text-brand-main">ag-rd-a8f2</td><td class="p-4">claude-3-5-sonnet</td><td class="p-4 font-mono">1,240</td><td class="p-4 font-mono">890</td><td class="p-4 text-secondary">3.4s</td><td class="p-4 text-right"><span class="badge badge-success">200</span></td></tr>
        <tr class="hover:bg-black/5 dark:hover:bg-white/5"><td class="p-4 text-secondary">2026-04-29 12:58</td><td class="p-4 font-mono text-brand-accent">ag-test-x1y2</td><td class="p-4">gpt-4o</td><td class="p-4 font-mono">-</td><td class="p-4 font-mono">-</td><td class="p-4 text-secondary">-</td><td class="p-4 text-right"><span class="badge badge-warning">403</span></td></tr>
      </tbody>
    </table>
  </div>
</div>

<div id="tab-image" class="log-tab hidden">
  <div class="card p-0 overflow-hidden">
    <table class="w-full text-left">
      <thead class="border-b text-xs text-secondary uppercase tracking-wider" style="border-color:var(--border-color);background:rgba(0,0,0,0.05)">
        <tr><th class="p-4">时间</th><th class="p-4">Key</th><th class="p-4">模型</th><th class="p-4">尺寸</th><th class="p-4">提示词摘要</th><th class="p-4">费用</th><th class="p-4 text-right">状态</th></tr>
      </thead>
      <tbody class="text-sm divide-y" style="border-color:var(--border-color)">
        <tr class="hover:bg-black/5 dark:hover:bg-white/5"><td class="p-4 text-secondary">2026-04-29 11:30</td><td class="p-4 font-mono text-brand-main">ag-prod-c3d4</td><td class="p-4">dall-e-3</td><td class="p-4">1024x1024</td><td class="p-4 text-secondary max-w-xs truncate">一只赛博朋克风格的熊猫...</td><td class="p-4 font-mono">¥ 2.00</td><td class="p-4 text-right"><span class="badge badge-success">200</span></td></tr>
        <tr class="hover:bg-black/5 dark:hover:bg-white/5"><td class="p-4 text-secondary">2026-04-29 10:15</td><td class="p-4 font-mono text-brand-main">ag-rd-a8f2</td><td class="p-4">dall-e-3</td><td class="p-4">1792x1024</td><td class="p-4 text-secondary max-w-xs truncate">企业级 AI 网关架构图...</td><td class="p-4 font-mono">¥ 4.00</td><td class="p-4 text-right"><span class="badge badge-success">200</span></td></tr>
      </tbody>
    </table>
  </div>
</div>

<div id="tab-video" class="log-tab hidden">
  <div class="card p-0 overflow-hidden">
    <table class="w-full text-left">
      <thead class="border-b text-xs text-secondary uppercase tracking-wider" style="border-color:var(--border-color);background:rgba(0,0,0,0.05)">
        <tr><th class="p-4">时间</th><th class="p-4">Key</th><th class="p-4">模型</th><th class="p-4">时长</th><th class="p-4">分辨率</th><th class="p-4">费用</th><th class="p-4 text-right">状态</th></tr>
      </thead>
      <tbody class="text-sm divide-y" style="border-color:var(--border-color)">
        <tr class="hover:bg-black/5 dark:hover:bg-white/5"><td class="p-4 text-secondary">2026-04-28 18:20</td><td class="p-4 font-mono text-brand-main">ag-prod-c3d4</td><td class="p-4">sora-turbo</td><td class="p-4">10s</td><td class="p-4">1080p</td><td class="p-4 font-mono">¥ 50.00</td><td class="p-4 text-right"><span class="badge badge-success">200</span></td></tr>
      </tbody>
    </table>
  </div>
</div>

<div id="tab-agent" class="log-tab hidden">
  <div class="card p-0 overflow-hidden">
    <table class="w-full text-left">
      <thead class="border-b text-xs text-secondary uppercase tracking-wider" style="border-color:var(--border-color);background:rgba(0,0,0,0.05)">
        <tr><th class="p-4">时间</th><th class="p-4">用户</th><th class="p-4">Agent</th><th class="p-4">调用知识库</th><th class="p-4">工具调用次数</th><th class="p-4">总 Tokens</th><th class="p-4 text-right">状态</th></tr>
      </thead>
      <tbody class="text-sm divide-y" style="border-color:var(--border-color)">
        <tr class="hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"><td class="p-4 text-secondary">2026-04-29 14:05</td><td class="p-4">张三</td><td class="p-4 text-brand-main font-bold">AiGate Bot</td><td class="p-4 text-secondary">SLA 运维手册</td><td class="p-4 font-mono">3</td><td class="p-4 font-mono">2,480</td><td class="p-4 text-right"><span class="badge badge-success">完成</span></td></tr>
        <tr class="hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"><td class="p-4 text-secondary">2026-04-29 13:40</td><td class="p-4">李四</td><td class="p-4 font-bold">代码审查助手</td><td class="p-4 text-secondary">研发规章手册</td><td class="p-4 font-mono">7</td><td class="p-4 font-mono">5,120</td><td class="p-4 text-right"><span class="badge badge-success">完成</span></td></tr>
      </tbody>
    </table>
  </div>
</div>

<script>
function switchTab(btn, tabId) {{
  document.querySelectorAll('.log-tab').forEach(t => t.classList.add('hidden'));
  document.querySelectorAll('.log-tab-btn').forEach(b => {{
    b.style.borderColor = 'transparent';
    b.style.color = 'var(--text-secondary)';
  }});
  document.getElementById(tabId).classList.remove('hidden');
  btn.style.borderColor = 'var(--brand-main)';
  btn.style.color = 'var(--brand-main)';
}}
</script>
"""),
}

for filename, (title, content) in PAGES.items():
    page_html = make_page(title, content)
    with open(os.path.join(BASE_DIR, filename), "w", encoding="utf-8") as f:
        f.write(page_html)
    print(f"Patched {filename}")

print("Done!")
