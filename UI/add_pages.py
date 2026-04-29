import os

BASE_DIR = r"d:\workspace\XYTX\AiGate\ui"

# Read template from existing generated file
with open(os.path.join(BASE_DIR, "dashboard.html"), "r", encoding="utf-8") as f:
    sample = f.read()

# Extract head and nav sections
head_end = sample.find("</head>") + 7
body_end = sample.find('<main class="flex-1')
tail_start = sample.find("</main>")
tail = sample[tail_start:]

HEAD = sample[:head_end]
NAV = sample[head_end:body_end]

def make_page(title, content):
    # Update active nav item
    nav = NAV.replace('href="dashboard.html" class="nav-item active"', 'href="dashboard.html" class="nav-item"')
    return HEAD + "\n<body>\n" + nav + '\n<main class="flex-1 overflow-y-auto p-6 lg:p-10 relative"><div class="max-w-7xl mx-auto">\n' + content + "\n</div></main>\n" + tail

PAGES = {
    "models.html": ("模型资产管理", """
<div class="flex items-center justify-between mb-8">
  <div>
    <h1 class="text-3xl font-bold tracking-tight">模型资产管理</h1>
    <p class="text-secondary mt-1">管理所有渠道下的可用模型，监控各模型剩余额度与调用健康状态。</p>
  </div>
  <button class="btn-primary" data-roles="sys_admin">+ 添加模型</button>
</div>

<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
  <div class="card text-center"><div class="text-3xl font-black text-brand-main mb-1">24</div><div class="text-xs text-secondary uppercase tracking-widest">活跃模型</div></div>
  <div class="card text-center"><div class="text-3xl font-black mb-1">6</div><div class="text-xs text-secondary uppercase tracking-widest">渠道来源</div></div>
  <div class="card text-center"><div class="text-3xl font-black text-brand-accent mb-1">3</div><div class="text-xs text-secondary uppercase tracking-widest">低余量预警</div></div>
  <div class="card text-center"><div class="text-3xl font-black mb-1">¥12,450</div><div class="text-xs text-secondary uppercase tracking-widest">本月消耗</div></div>
</div>

<div class="card mb-6 flex flex-wrap gap-4 items-end" style="background:rgba(0,0,0,0.05)">
  <div class="space-y-1 flex-1 min-w-40">
    <label class="text-xs font-bold text-secondary uppercase tracking-widest">渠道筛选</label>
    <select class="input-base">
      <option>全部渠道</option><option>OpenAI Official</option><option>Anthropic Claude</option><option>Google Gemini</option>
    </select>
  </div>
  <div class="space-y-1 flex-1 min-w-40">
    <label class="text-xs font-bold text-secondary uppercase tracking-widest">类型</label>
    <select class="input-base"><option>全部类型</option><option>对话 (Chat)</option><option>生图 (Image)</option><option>生视频 (Video)</option><option>嵌入 (Embedding)</option></select>
  </div>
  <div class="space-y-1 flex-1 min-w-40">
    <label class="text-xs font-bold text-secondary uppercase tracking-widest">健康状态</label>
    <select class="input-base"><option>全部</option><option>正常</option><option>低余量</option><option>耗尽</option></select>
  </div>
</div>

<div class="card p-0 overflow-hidden">
  <table class="w-full text-left border-collapse">
    <thead class="border-b" style="border-color:var(--border-color);background:rgba(0,0,0,0.05)">
      <tr>
        <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider">模型名称</th>
        <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider">类型</th>
        <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider">渠道</th>
        <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider">剩余额度</th>
        <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider">额度水位</th>
        <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider">今日调用</th>
        <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider">状态</th>
        <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-right">操作</th>
      </tr>
    </thead>
    <tbody class="text-sm divide-y" style="border-color:var(--border-color)">
      <tr class="hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-b" style="border-color:var(--border-color)">
        <td class="p-4"><div class="font-bold">gpt-4o</div><div class="text-xs text-secondary font-mono mt-0.5">OpenAI</div></td>
        <td class="p-4"><span class="badge border-gray-500">Chat</span></td>
        <td class="p-4 text-secondary">OpenAI Official</td>
        <td class="p-4 font-mono font-bold">$180.00</td>
        <td class="p-4 w-40"><div class="w-full h-2 rounded-full" style="background:var(--border-color)"><div class="h-2 rounded-full bg-brand-main" style="width:64%"></div></div><div class="text-xs text-secondary mt-1">已用 36% · 余 64%</div></td>
        <td class="p-4 font-mono">8,432</td>
        <td class="p-4"><span class="badge badge-success">正常</span></td>
        <td class="p-4 text-right"><button class="text-brand-main font-bold text-xs hover:underline">详情</button></td>
      </tr>
      <tr class="hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-b" style="border-color:var(--border-color)">
        <td class="p-4"><div class="font-bold">claude-3-5-sonnet</div><div class="text-xs text-secondary font-mono mt-0.5">Anthropic</div></td>
        <td class="p-4"><span class="badge border-gray-500">Chat</span></td>
        <td class="p-4 text-secondary">Anthropic Claude</td>
        <td class="p-4 font-mono font-bold text-brand-accent">$12.40</td>
        <td class="p-4 w-40"><div class="w-full h-2 rounded-full" style="background:var(--border-color)"><div class="h-2 rounded-full bg-brand-accent" style="width:92%"></div></div><div class="text-xs text-brand-accent mt-1">已用 92% · 低余量</div></td>
        <td class="p-4 font-mono">3,218</td>
        <td class="p-4"><span class="badge badge-warning">低余量</span></td>
        <td class="p-4 text-right"><button class="text-brand-main font-bold text-xs hover:underline">详情</button></td>
      </tr>
      <tr class="hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-b" style="border-color:var(--border-color)">
        <td class="p-4"><div class="font-bold">dall-e-3</div><div class="text-xs text-secondary font-mono mt-0.5">OpenAI</div></td>
        <td class="p-4"><span class="badge border-gray-500">Image</span></td>
        <td class="p-4 text-secondary">OpenAI Official</td>
        <td class="p-4 font-mono font-bold">$45.00</td>
        <td class="p-4 w-40"><div class="w-full h-2 rounded-full" style="background:var(--border-color)"><div class="h-2 rounded-full bg-brand-main" style="width:55%"></div></div><div class="text-xs text-secondary mt-1">已用 45% · 余 55%</div></td>
        <td class="p-4 font-mono">124</td>
        <td class="p-4"><span class="badge badge-success">正常</span></td>
        <td class="p-4 text-right"><button class="text-brand-main font-bold text-xs hover:underline">详情</button></td>
      </tr>
      <tr class="hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-b" style="border-color:var(--border-color)">
        <td class="p-4"><div class="font-bold">sora-turbo</div><div class="text-xs text-secondary font-mono mt-0.5">OpenAI</div></td>
        <td class="p-4"><span class="badge border-gray-500">Video</span></td>
        <td class="p-4 text-secondary">OpenAI Official</td>
        <td class="p-4 font-mono font-bold">$320.00</td>
        <td class="p-4 w-40"><div class="w-full h-2 rounded-full" style="background:var(--border-color)"><div class="h-2 rounded-full bg-brand-main" style="width:20%"></div></div><div class="text-xs text-secondary mt-1">已用 20% · 余 80%</div></td>
        <td class="p-4 font-mono">18</td>
        <td class="p-4"><span class="badge badge-success">正常</span></td>
        <td class="p-4 text-right"><button class="text-brand-main font-bold text-xs hover:underline">详情</button></td>
      </tr>
      <tr class="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
        <td class="p-4"><div class="font-bold">text-embedding-3-large</div><div class="text-xs text-secondary font-mono mt-0.5">OpenAI</div></td>
        <td class="p-4"><span class="badge border-gray-500">Embedding</span></td>
        <td class="p-4 text-secondary">OpenAI Official</td>
        <td class="p-4 font-mono font-bold">$88.00</td>
        <td class="p-4 w-40"><div class="w-full h-2 rounded-full" style="background:var(--border-color)"><div class="h-2 rounded-full bg-brand-main" style="width:44%"></div></div><div class="text-xs text-secondary mt-1">已用 56% · 余 44%</div></td>
        <td class="p-4 font-mono">45,210</td>
        <td class="p-4"><span class="badge badge-success">正常</span></td>
        <td class="p-4 text-right"><button class="text-brand-main font-bold text-xs hover:underline">详情</button></td>
      </tr>
    </tbody>
  </table>
</div>
"""),

    "billing.html": ("消耗报表", """
<div class="flex items-center justify-between mb-8">
  <div>
    <h1 class="text-3xl font-bold tracking-tight">消耗报表</h1>
    <p class="text-secondary mt-1">按模型、组织、密钥多维度统计 AI 调用费用，支持导出账单。</p>
  </div>
  <button class="btn-primary">导出 Excel</button>
</div>

<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
  <div class="card"><div class="text-xs text-secondary uppercase tracking-widest mb-1">本月总消耗</div><div class="text-2xl font-black text-brand-main">¥ 12,450</div><div class="text-xs text-secondary mt-1">较上月 +18%</div></div>
  <div class="card"><div class="text-xs text-secondary uppercase tracking-widest mb-1">本月 Tokens</div><div class="text-2xl font-black">48.2 M</div><div class="text-xs text-secondary mt-1">输入 32M / 输出 16M</div></div>
  <div class="card"><div class="text-xs text-secondary uppercase tracking-widest mb-1">生图次数</div><div class="text-2xl font-black">1,248</div><div class="text-xs text-secondary mt-1">dall-e-3 为主</div></div>
  <div class="card"><div class="text-xs text-secondary uppercase tracking-widest mb-1">活跃 Key 数</div><div class="text-2xl font-black">15</div><div class="text-xs text-secondary mt-1">共 18 个 Key</div></div>
</div>

<div class="card mb-6 flex flex-wrap gap-4 items-end" style="background:rgba(0,0,0,0.05)">
  <div class="space-y-1"><label class="text-xs font-bold text-secondary uppercase tracking-widest">时间段</label>
    <select class="input-base w-40"><option>本月</option><option>上月</option><option>最近 7 天</option><option>自定义</option></select></div>
  <div class="space-y-1"><label class="text-xs font-bold text-secondary uppercase tracking-widest">组织</label>
    <select class="input-base w-40"><option>全部</option><option>北京研发中心</option><option>架构组</option></select></div>
  <div class="space-y-1"><label class="text-xs font-bold text-secondary uppercase tracking-widest">模型类型</label>
    <select class="input-base w-40"><option>全部</option><option>Chat</option><option>Image</option><option>Video</option><option>Embedding</option></select></div>
  <button class="btn-secondary ml-auto">查询</button>
</div>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
  <div class="card">
    <h3 class="font-bold mb-4">模型消耗分布</h3>
    <div class="space-y-3">
      <div><div class="flex justify-between text-sm mb-1"><span class="font-medium">gpt-4o</span><span class="text-secondary">¥ 5,820 (46.8%)</span></div><div class="h-2 rounded-full" style="background:var(--border-color)"><div class="h-2 rounded-full bg-brand-main" style="width:46.8%"></div></div></div>
      <div><div class="flex justify-between text-sm mb-1"><span class="font-medium">claude-3-5-sonnet</span><span class="text-secondary">¥ 3,240 (26.0%)</span></div><div class="h-2 rounded-full" style="background:var(--border-color)"><div class="h-2 rounded-full bg-brand-accent" style="width:26%"></div></div></div>
      <div><div class="flex justify-between text-sm mb-1"><span class="font-medium">dall-e-3</span><span class="text-secondary">¥ 2,100 (16.9%)</span></div><div class="h-2 rounded-full" style="background:var(--border-color)"><div class="h-2 rounded-full" style="background:var(--brand-main);width:16.9%;opacity:0.6"></div></div></div>
      <div><div class="flex justify-between text-sm mb-1"><span class="font-medium">gemini-1.5-pro</span><span class="text-secondary">¥ 1,290 (10.4%)</span></div><div class="h-2 rounded-full" style="background:var(--border-color)"><div class="h-2 rounded-full" style="background:var(--brand-main);width:10.4%;opacity:0.4"></div></div></div>
    </div>
  </div>
  <div class="card">
    <h3 class="font-bold mb-4">部门消耗 Top 5</h3>
    <div class="space-y-3">
      <div class="flex items-center justify-between p-2 rounded-lg" style="background:rgba(0,0,0,0.05)">
        <span class="font-medium text-sm">北京研发中心</span><span class="font-mono font-bold text-brand-main">¥ 5,210</span>
      </div>
      <div class="flex items-center justify-between p-2 rounded-lg" style="background:rgba(0,0,0,0.05)">
        <span class="font-medium text-sm">架构组</span><span class="font-mono font-bold">¥ 3,840</span>
      </div>
      <div class="flex items-center justify-between p-2 rounded-lg" style="background:rgba(0,0,0,0.05)">
        <span class="font-medium text-sm">数据平台部</span><span class="font-mono font-bold">¥ 2,100</span>
      </div>
      <div class="flex items-center justify-between p-2 rounded-lg" style="background:rgba(0,0,0,0.05)">
        <span class="font-medium text-sm">产品设计组</span><span class="font-mono font-bold">¥ 880</span>
      </div>
      <div class="flex items-center justify-between p-2 rounded-lg" style="background:rgba(0,0,0,0.05)">
        <span class="font-medium text-sm">运维 SRE</span><span class="font-mono font-bold">¥ 420</span>
      </div>
    </div>
  </div>
</div>

<div class="card p-0 overflow-hidden">
  <div class="p-4 border-b font-bold flex justify-between items-center" style="border-color:var(--border-color)">
    <span>明细账单</span><span class="text-xs text-secondary font-normal">共 128 条记录</span>
  </div>
  <table class="w-full text-left border-collapse">
    <thead class="border-b" style="border-color:var(--border-color);background:rgba(0,0,0,0.05)">
      <tr>
        <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider">日期</th>
        <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider">调用 Key</th>
        <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider">模型</th>
        <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider">类型</th>
        <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider">Tokens / 次数</th>
        <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-right">费用</th>
      </tr>
    </thead>
    <tbody class="text-sm">
      <tr class="border-b hover:bg-black/5 dark:hover:bg-white/5" style="border-color:var(--border-color)">
        <td class="p-4 text-secondary">2026-04-29</td>
        <td class="p-4 font-mono text-brand-main">ag-rd-a8f2</td>
        <td class="p-4">gpt-4o</td>
        <td class="p-4"><span class="badge border-gray-500">Chat</span></td>
        <td class="p-4 font-mono">128,450</td>
        <td class="p-4 text-right font-mono font-bold">¥ 128.45</td>
      </tr>
      <tr class="border-b hover:bg-black/5 dark:hover:bg-white/5" style="border-color:var(--border-color)">
        <td class="p-4 text-secondary">2026-04-29</td>
        <td class="p-4 font-mono text-brand-main">ag-prod-c3d4</td>
        <td class="p-4">dall-e-3</td>
        <td class="p-4"><span class="badge border-gray-500">Image</span></td>
        <td class="p-4 font-mono">48 张</td>
        <td class="p-4 text-right font-mono font-bold">¥ 96.00</td>
      </tr>
      <tr class="hover:bg-black/5 dark:hover:bg-white/5">
        <td class="p-4 text-secondary">2026-04-28</td>
        <td class="p-4 font-mono text-brand-main">ag-rd-a8f2</td>
        <td class="p-4">sora-turbo</td>
        <td class="p-4"><span class="badge border-gray-500">Video</span></td>
        <td class="p-4 font-mono">3 个视频</td>
        <td class="p-4 text-right font-mono font-bold">¥ 150.00</td>
      </tr>
    </tbody>
  </table>
</div>
"""),

    "profile.html": ("个人中心", """
<div class="flex items-center justify-between mb-8">
  <div><h1 class="text-3xl font-bold tracking-tight">个人中心</h1>
    <p class="text-secondary mt-1">查看个人账号信息、配额余量与通知绑定。</p></div>
  <button class="btn-primary">保存修改</button>
</div>
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div class="card col-span-1 flex flex-col items-center text-center py-10">
    <div class="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black mb-4" style="background:var(--brand-main);color:var(--bg-body)">张</div>
    <div class="text-xl font-bold">张三</div>
    <div class="text-secondary text-sm mt-1">zhangsan@company.com</div>
    <div class="mt-3"><span class="badge badge-success">普通成员</span></div>
    <div class="mt-4 text-xs text-secondary">归属: 北京研发中心 / 架构组</div>
    <div class="mt-6 w-full border-t pt-6 space-y-3 text-left" style="border-color:var(--border-color)">
      <div class="flex justify-between text-sm"><span class="text-secondary">本月已用额度</span><span class="font-bold">¥ 248.50</span></div>
      <div class="flex justify-between text-sm"><span class="text-secondary">个人配额上限</span><span class="font-bold">¥ 500.00</span></div>
      <div class="h-2 rounded-full mt-1" style="background:var(--border-color)">
        <div class="h-2 rounded-full bg-brand-main" style="width:49.7%"></div>
      </div>
      <div class="text-xs text-secondary text-right">已用 49.7%</div>
    </div>
  </div>
  <div class="col-span-2 space-y-6">
    <div class="card space-y-4">
      <h3 class="font-bold border-b pb-3" style="border-color:var(--border-color)">基本信息</h3>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="text-xs font-bold text-secondary uppercase tracking-widest block mb-1">姓名</label><input class="input-base" value="张三"></div>
        <div><label class="text-xs font-bold text-secondary uppercase tracking-widest block mb-1">邮箱</label><input class="input-base" value="zhangsan@company.com"></div>
        <div><label class="text-xs font-bold text-secondary uppercase tracking-widest block mb-1">手机号</label><input class="input-base" value="138****5678"></div>
        <div><label class="text-xs font-bold text-secondary uppercase tracking-widest block mb-1">企业微信 ID</label><input class="input-base" placeholder="绑定后接收预警推送"></div>
      </div>
    </div>
    <div class="card space-y-4">
      <h3 class="font-bold border-b pb-3" style="border-color:var(--border-color)">修改密码</h3>
      <div><label class="text-xs font-bold text-secondary uppercase tracking-widest block mb-1">当前密码</label><input type="password" class="input-base" placeholder="••••••••"></div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="text-xs font-bold text-secondary uppercase tracking-widest block mb-1">新密码</label><input type="password" class="input-base" placeholder="至少 8 位"></div>
        <div><label class="text-xs font-bold text-secondary uppercase tracking-widest block mb-1">确认新密码</label><input type="password" class="input-base" placeholder="再次输入"></div>
      </div>
      <button class="btn-secondary text-sm">更新密码</button>
    </div>
    <div class="card space-y-4">
      <h3 class="font-bold border-b pb-3" style="border-color:var(--border-color)">我的 API Key</h3>
      <div class="space-y-3">
        <div class="flex items-center justify-between p-3 rounded-lg border" style="border-color:var(--border-color)">
          <div><div class="font-mono text-sm font-bold text-brand-main">ag-dev-3a1b****ef90</div><div class="text-xs text-secondary mt-0.5">DEV · 到期: 2026-07-28 · 支持: gpt-4o, claude-3-5</div></div>
          <div class="flex gap-2"><button class="btn-secondary text-xs py-1 px-2">复制</button><button class="text-brand-accent text-xs font-bold hover:underline">吊销</button></div>
        </div>
      </div>
      <a href="keys.html" class="btn-primary inline-flex text-sm">管理我的所有密钥</a>
    </div>
  </div>
</div>
"""),
}

for filename, (title, content) in PAGES.items():
    page_html = make_page(title, content)
    # Update title
    page_html = page_html.replace("AiGate - 数据大盘", f"AiGate - {title}")
    with open(os.path.join(BASE_DIR, filename), "w", encoding="utf-8") as f:
        f.write(page_html)
    print(f"Generated {filename}")

print("Done!")
