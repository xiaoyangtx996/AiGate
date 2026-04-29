import os

BASE_DIR = r"d:\workspace\XYTX\AiGate\ui"

PAGES = {
    "login.html": {
        "title": "系统登录",
        "icon": "",
        "content": """
                <div class="flex items-center justify-center min-h-[80vh]">
                    <div class="card w-full max-w-md p-10 relative overflow-hidden">
                        <div class="absolute top-0 right-0 w-32 h-32 bg-brand-main opacity-10 rounded-bl-full -z-10"></div>
                        <div class="flex items-center gap-3 mb-8">
                            <div class="w-10 h-10 flex items-center justify-center font-bold text-xl rounded-xl" style="background: var(--brand-main); color: var(--bg-body);">A</div>
                            <span class="text-3xl font-black tracking-tight">AiGate <span class="text-secondary text-lg ml-1 font-normal">Enterprise</span></span>
                        </div>
                        <h2 class="text-xl font-bold mb-2">多租户安全网关</h2>
                        <p class="text-secondary text-sm mb-8">请使用企业域账号或分配的租户凭证登录。</p>
                        
                        <form class="space-y-6" onsubmit="event.preventDefault(); window.location.href='dashboard.html';">
                            <div>
                                <label class="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">账号 (Username)</label>
                                <input type="text" class="input-base py-3" placeholder="admin / tenant / user" required>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-secondary uppercase tracking-widest mb-2">密码 (Password)</label>
                                <input type="password" class="input-base py-3" placeholder="••••••••" required>
                            </div>
                            <div class="flex items-center justify-between">
                                <label class="flex items-center gap-2 text-sm text-secondary cursor-pointer">
                                    <input type="checkbox" class="rounded border-gray-400"> 记住登录状态
                                </label>
                                <a href="#" class="text-sm font-bold text-brand-main hover:underline">忘记密码?</a>
                            </div>
                            <button type="submit" class="btn-primary w-full py-3 text-lg mt-4">登 录</button>
                        </form>
                        
                        <div class="mt-8 text-center border-t pt-6" style="border-color: var(--border-color)">
                            <p class="text-xs text-secondary">登录体验不同角色视图</p>
                            <div class="flex justify-center gap-2 mt-3">
                                <button onclick="setRole('sys_admin'); window.location.href='dashboard.html'" class="badge badge-success cursor-pointer hover:scale-105 transition-transform">系统超管</button>
                                <button onclick="setRole('tenant_admin'); window.location.href='dashboard.html'" class="badge badge-warning cursor-pointer hover:scale-105 transition-transform">租户管理</button>
                                <button onclick="setRole('user'); window.location.href='agent.html'" class="badge border cursor-pointer hover:scale-105 transition-transform text-secondary">普通成员</button>
                            </div>
                        </div>
                    </div>
                </div>
        """
    },
    "dashboard.html": {
        "title": "数据大盘",
        "icon": "M3 3v18h18 M18 17V9 M13 17V5 M8 17v-3", # bar chart
        "content": """
                <div class="flex items-center justify-between mb-8">
                    <div>
                        <h1 class="text-3xl font-bold tracking-tight">数据大盘</h1>
                        <p class="text-secondary mt-1">全局网关流量、大模型消耗以及系统运行状态监控。</p>
                    </div>
                    <div class="flex gap-2">
                        <select class="input-base text-xs font-bold"><option>最近 7 天</option><option>本月</option></select>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div class="card p-5">
                        <h3 class="text-secondary text-xs font-bold uppercase tracking-widest mb-1">今日总消耗 (CNY)</h3>
                        <div class="text-3xl font-bold">¥ 3,245.50</div>
                        <div class="text-xs text-brand-main mt-2 font-bold flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg> +12.5% 较昨日</div>
                    </div>
                    <div class="card p-5">
                        <h3 class="text-secondary text-xs font-bold uppercase tracking-widest mb-1">今日请求数 (RPM)</h3>
                        <div class="text-3xl font-bold">124,592</div>
                        <div class="text-xs text-brand-main mt-2 font-bold flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg> +5.2% 较昨日</div>
                    </div>
                    <div class="card p-5">
                        <h3 class="text-secondary text-xs font-bold uppercase tracking-widest mb-1">活跃令牌 (Keys)</h3>
                        <div class="text-3xl font-bold">1,245</div>
                        <div class="text-xs text-secondary mt-2">系统中发放的总有效 Token 数</div>
                    </div>
                    <div class="card p-5">
                        <h3 class="text-secondary text-xs font-bold uppercase tracking-widest mb-1">网关异常 (4xx/5xx)</h3>
                        <div class="text-3xl font-bold text-brand-accent">24</div>
                        <div class="text-xs text-secondary mt-2">主要因配额耗尽 (403) 拦截</div>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="card col-span-1 lg:col-span-2 h-80 flex flex-col">
                        <h3 class="font-bold mb-4 text-sm uppercase tracking-widest text-secondary">近 30 天请求趋势</h3>
                        <div class="flex-1 border-dashed border-2 rounded-xl flex items-center justify-center" style="border-color: var(--border-color)">
                            <p class="text-secondary text-sm font-bold flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 9l-5 5-4-4-6 6"/></svg> [折线图渲染区域: 每日 Token 消耗与并发量]</p>
                        </div>
                    </div>
                    <div class="card col-span-1 h-80 flex flex-col">
                        <h3 class="font-bold mb-4 text-sm uppercase tracking-widest text-secondary">模型调用占比</h3>
                        <div class="flex-1 border-dashed border-2 rounded-xl flex flex-col gap-4 items-center justify-center p-4" style="border-color: var(--border-color)">
                            <div class="w-full flex justify-between items-center text-sm"><span class="font-bold text-brand-main">gpt-4o</span> <span class="font-mono">45%</span></div>
                            <div class="w-full bg-black/10 dark:bg-white/10 h-1.5 rounded overflow-hidden"><div class="bg-brand-main h-full w-[45%]"></div></div>
                            <div class="w-full flex justify-between items-center text-sm mt-2"><span class="font-bold text-brand-accent">claude-3-5-sonnet</span> <span class="font-mono">30%</span></div>
                            <div class="w-full bg-black/10 dark:bg-white/10 h-1.5 rounded overflow-hidden"><div class="bg-brand-accent h-full w-[30%]"></div></div>
                            <div class="w-full flex justify-between items-center text-sm mt-2"><span class="font-bold text-secondary">deepseek-coder</span> <span class="font-mono">15%</span></div>
                            <div class="w-full bg-black/10 dark:bg-white/10 h-1.5 rounded overflow-hidden"><div class="bg-secondary h-full w-[15%]"></div></div>
                        </div>
                    </div>
                </div>
        """
    },
    "users.html": {
        "title": "用户管理",
        "icon": "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", # user
        "content": """
                <div class="flex items-center justify-between mb-8">
                    <div>
                        <h1 class="text-3xl font-bold tracking-tight">用户管理</h1>
                        <p class="text-secondary mt-1">管理系统和租户下的所有子账号、余额与角色分配。</p>
                    </div>
                    <button class="btn-primary" onclick="document.getElementById('userModal').classList.remove('hidden')">+ 添加用户</button>
                </div>
                <div class="card p-0 overflow-hidden">
                    <div class="p-4 border-b flex gap-4 bg-black/5 dark:bg-white/5" style="border-color: var(--border-color)">
                        <input type="text" placeholder="搜索用户名或邮箱..." class="input-base w-64">
                        <select class="input-base w-40"><option>全部角色</option><option>租户管理员</option><option>普通用户</option></select>
                    </div>
                    <table class="w-full text-left border-collapse">
                        <thead class="border-b" style="border-color: var(--border-color)">
                            <tr>
                                <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider">用户名 / 邮箱</th>
                                <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider">归属组织</th>
                                <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider">个人额度 (CNY)</th>
                                <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider">角色</th>
                                <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody class="text-sm">
                            <tr class="border-b transition-colors hover:bg-black/5 dark:hover:bg-white/5" style="border-color: var(--border-color)">
                                <td class="p-4">
                                    <div class="font-bold">张三</div>
                                    <div class="text-xs text-secondary mt-1">zhangsan@company.com</div>
                                </td>
                                <td class="p-4"><span class="badge border-gray-500">北京研发中心</span></td>
                                <td class="p-4 font-mono font-bold">¥ 500.00</td>
                                <td class="p-4"><span class="badge badge-success">普通员工</span></td>
                                <td class="p-4 text-right">
                                    <button class="text-brand-main font-bold hover:underline mr-3 text-xs">充值</button>
                                    <button class="text-secondary font-bold hover:text-brand-accent text-xs">封禁</button>
                                </td>
                            </tr>
                            <tr class="transition-colors hover:bg-black/5 dark:hover:bg-white/5" style="border-color: var(--border-color)">
                                <td class="p-4">
                                    <div class="font-bold">李四 (管理员)</div>
                                    <div class="text-xs text-secondary mt-1">lisi@company.com</div>
                                </td>
                                <td class="p-4"><span class="badge border-gray-500">架构组</span></td>
                                <td class="p-4 font-mono font-bold text-brand-main">无限制</td>
                                <td class="p-4"><span class="badge badge-warning">租户管理</span></td>
                                <td class="p-4 text-right">
                                    <button class="text-brand-main font-bold hover:underline mr-3 text-xs">充值</button>
                                    <button class="text-secondary font-bold hover:text-brand-accent text-xs">封禁</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- 添加用户弹窗 -->
                <div id="userModal" class="hidden fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
                    <div class="card w-[480px] p-0 shadow-2xl overflow-hidden relative border border-border-color">
                        <div class="p-6 border-b" style="border-color: var(--border-color)">
                            <h2 class="text-xl font-bold">添加新用户</h2>
                        </div>
                        <div class="p-6 space-y-4">
                            <div>
                                <label class="block text-xs font-bold text-secondary uppercase mb-2">用户名</label>
                                <input type="text" class="input-base" placeholder="如：王五">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-secondary uppercase mb-2">邮箱</label>
                                <input type="email" class="input-base" placeholder="wangwu@company.com">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-secondary uppercase mb-2">角色</label>
                                <select class="input-base"><option>普通员工 (User)</option><option>租户管理员 (Tenant Admin)</option></select>
                            </div>
                        </div>
                        <div class="p-4 border-t flex justify-end gap-3 bg-black/5 dark:bg-white/5" style="border-color: var(--border-color)">
                            <button class="btn-secondary" onclick="document.getElementById('userModal').classList.add('hidden')">取消</button>
                            <button class="btn-primary" onclick="document.getElementById('userModal').classList.add('hidden')">确认保存</button>
                        </div>
                    </div>
                </div>
        """
    },
    "organization.html": {
        "title": "组织与配额",
        "icon": "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75", # users
        "content": """
                <div class="flex items-center justify-between mb-8">
                    <div>
                        <h1 class="text-3xl font-bold tracking-tight">组织与配额</h1>
                        <p class="text-secondary mt-1">管理四级组织架构（集团/分公司/部门/员工）及 Token 与资金双维配额。</p>
                    </div>
                    <button class="btn-primary" onclick="document.getElementById('orgModal').classList.remove('hidden')">新增组织节点</button>
                </div>
                <div class="flex flex-col md:flex-row gap-6">
                    <div class="w-full md:w-1/3 card h-96 overflow-y-auto">
                        <div class="font-bold mb-4 flex items-center justify-between">
                            <span>企业组织树</span>
                            <span class="badge badge-success">多租户</span>
                        </div>
                        <ul class="space-y-2 text-sm text-secondary">
                            <li class="flex items-center gap-2 text-brand-main font-bold"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> 集团总部 (Root)</li>
                            <li class="pl-6 flex items-center gap-2 border-l border-gray-600 ml-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg> 北京研发中心 (租户)</li>
                            <li class="pl-12 flex items-center gap-2 border-l border-gray-600 ml-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg> AI 架构部 (部门)</li>
                            <li class="pl-16 flex items-center gap-2 text-text-primary ml-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> 张三 (员工/3密钥)</li>
                            <li class="pl-16 flex items-center gap-2 ml-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> 李四 (员工/1密钥)</li>
                        </ul>
                    </div>
                    <div class="flex-1 card flex flex-col items-center justify-center border-dashed bg-transparent shadow-none">
                        <div class="flex justify-between items-start w-full mb-8">
                            <div>
                                <h2 class="text-2xl font-bold flex items-center gap-3">北京研发中心 <span class="badge badge-success">租户级</span></h2>
                                <p class="text-sm text-secondary mt-2 font-mono">TENANT_BJ_01</p>
                            </div>
                            <button class="btn-secondary">超额申请</button>
                        </div>
                        <div class="flex gap-8 w-full">
                            <div class="flex-1 card border-solid border-border-color bg-surface">
                                <p class="text-xs font-bold text-secondary uppercase mb-2">本月资金配额 (CNY)</p>
                                <p class="text-2xl font-bold">¥ 15,000 / ¥ 50,000</p>
                                <div class="w-full bg-black/10 dark:bg-white/10 h-1 mt-2 rounded overflow-hidden"><div class="bg-brand-main h-1 w-[30%]"></div></div>
                            </div>
                            <div class="flex-1 card border-solid border-border-color bg-surface">
                                <p class="text-xs font-bold text-secondary uppercase mb-2">总量 Token 配额</p>
                                <p class="text-2xl font-bold">4.2M / 10M</p>
                                <div class="w-full bg-black/10 dark:bg-white/10 h-1 mt-2 rounded overflow-hidden"><div class="bg-brand-accent h-1 w-[42%]"></div></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 新增组织节点弹窗 -->
                <div id="orgModal" class="hidden fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
                    <div class="card w-[480px] p-0 shadow-2xl overflow-hidden relative border border-border-color">
                        <div class="p-6 border-b" style="border-color: var(--border-color)">
                            <h2 class="text-xl font-bold">新增组织节点</h2>
                        </div>
                        <div class="p-6 space-y-4">
                            <div>
                                <label class="block text-xs font-bold text-secondary uppercase mb-2">父级节点</label>
                                <select class="input-base"><option>北京研发中心 (租户)</option><option>AI 架构部 (部门)</option></select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-secondary uppercase mb-2">节点名称</label>
                                <input type="text" class="input-base" placeholder="例如：前端开发组">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-secondary uppercase mb-2">资金配额上限 (CNY)</label>
                                <input type="number" class="input-base" placeholder="可选填">
                            </div>
                        </div>
                        <div class="p-4 border-t flex justify-end gap-3 bg-black/5 dark:bg-white/5" style="border-color: var(--border-color)">
                            <button class="btn-secondary" onclick="document.getElementById('orgModal').classList.add('hidden')">取消</button>
                            <button class="btn-primary" onclick="document.getElementById('orgModal').classList.add('hidden')">确定新增</button>
                        </div>
                    </div>
                </div>
        """
    },
    "keys.html": {
        "title": "密钥管理",
        "icon": "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4", # key
        "content": """
                <div class="flex items-center justify-between mb-8">
                    <div>
                        <h1 class="text-3xl font-bold tracking-tight">密钥与凭证</h1>
                        <p class="text-secondary mt-1">管理 API Key 访问凭证（格式: ag-{env}-{hex}），员工持有上限 3 个。</p>
                    </div>
                    <div class="flex gap-3">
                        <span class="badge flex items-center justify-center bg-surface border-border-color">当前拥有: 2 / 3</span>
                        <button class="btn-primary" onclick="document.getElementById('keyModal').classList.remove('hidden')">+ 生成新密钥</button>
                    </div>
                </div>
                <div class="card p-0 overflow-hidden">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-black/5 dark:bg-white/5 border-b" style="border-color: var(--border-color)">
                            <tr>
                                <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider">密钥别名 / Key</th>
                                <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider">环境</th>
                                <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider">到期时间</th>
                                <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-center">状态</th>
                                <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody class="text-sm">
                            <tr class="border-b transition-colors hover:bg-black/5 dark:hover:bg-white/5" style="border-color: var(--border-color)">
                                <td class="p-4 font-mono text-sm">
                                    <div class="font-sans font-bold mb-1">Cursor 专用</div>
                                    <span class="text-brand-main">ag-prod-8f2c...e1b9</span>
                                </td>
                                <td class="p-4"><span class="badge border-gray-500">PROD</span></td>
                                <td class="p-4 text-secondary">2026-12-31</td>
                                <td class="p-4 text-center"><span class="badge badge-success">正常</span></td>
                                <td class="p-4 text-right"><button class="btn-secondary text-xs py-1 px-3 text-brand-accent">吊销</button></td>
                            </tr>
                            <tr class="transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                                <td class="p-4 font-mono text-sm">
                                    <div class="font-sans font-bold mb-1">测试自动化 Key</div>
                                    <span class="text-secondary">ag-dev-3a1b...9c8d</span>
                                </td>
                                <td class="p-4"><span class="badge border-gray-500">DEV</span></td>
                                <td class="p-4 text-brand-accent font-bold">即将过期 (3天)</td>
                                <td class="p-4 text-center"><span class="badge badge-success">正常</span></td>
                                <td class="p-4 text-right"><button class="btn-secondary text-xs py-1 px-3 text-brand-accent">吊销</button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- 生成密钥弹窗 -->
                <div id="keyModal" class="hidden fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
                    <div class="card w-[480px] p-0 shadow-2xl overflow-hidden relative border border-border-color">
                        <div class="p-6 border-b" style="border-color: var(--border-color)">
                            <h2 class="text-xl font-bold">生成新 API Key</h2>
                        </div>
                        <div class="p-6 space-y-4">
                            <div>
                                <label class="block text-xs font-bold text-secondary uppercase mb-2">用途名称</label>
                                <input type="text" class="input-base" placeholder="例如：自动化测试脚本使用">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-secondary uppercase mb-2">作用环境 (Environment)</label>
                                <select class="input-base"><option>开发环境 (DEV)</option><option>生产环境 (PROD)</option></select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-secondary uppercase mb-2">有效时长</label>
                                <select class="input-base"><option>30 天</option><option>90 天 (推荐)</option><option>永久有效 (需审批)</option></select>
                            </div>
                        </div>
                        <div class="p-4 border-t flex justify-end gap-3 bg-black/5 dark:bg-white/5" style="border-color: var(--border-color)">
                            <button class="btn-secondary" onclick="document.getElementById('keyModal').classList.add('hidden')">取消</button>
                            <button class="btn-primary" onclick="document.getElementById('keyModal').classList.add('hidden')">立即生成</button>
                        </div>
                    </div>
                </div>
        """
    },
    "channels.html": {
        "title": "网关与渠道",
        "icon": "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12", # hexagon / proxy
        "content": """
                <div class="flex items-center justify-between mb-8">
                    <div>
                        <h1 class="text-3xl font-bold tracking-tight">模型渠道配置</h1>
                        <p class="text-secondary mt-1">配置上游供应商 API 代理（如 OpenAI、Anthropic、智谱等）及高可用负载均衡。</p>
                    </div>
                    <button class="btn-primary">+ 新增渠道</button>
                </div>
                <div class="card p-0 overflow-hidden">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-black/5 dark:bg-white/5 border-b" style="border-color: var(--border-color)">
                            <tr>
                                <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider">渠道名称 / 厂商</th>
                                <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider">支持模型</th>
                                <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-center">优先级</th>
                                <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-center">响应延迟</th>
                                <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-center">状态</th>
                                <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody class="text-sm">
                            <tr class="border-b transition-colors hover:bg-black/5 dark:hover:bg-white/5" style="border-color: var(--border-color)">
                                <td class="p-4">
                                    <div class="font-bold flex items-center gap-2">Azure OpenAI <span class="badge border-gray-500 text-[10px]">微软</span></div>
                                    <div class="text-xs text-secondary mt-1 font-mono">https://hk-azure.openai.azure.com</div>
                                </td>
                                <td class="p-4">
                                    <div class="flex gap-1 flex-wrap w-48">
                                        <span class="badge border border-gray-600 bg-transparent text-[10px]">gpt-4o</span>
                                        <span class="badge border border-gray-600 bg-transparent text-[10px]">text-embedding-3</span>
                                    </div>
                                </td>
                                <td class="p-4 text-center font-bold">1</td>
                                <td class="p-4 text-center font-mono text-emerald-500">24ms</td>
                                <td class="p-4 text-center"><span class="badge badge-success">启用</span></td>
                                <td class="p-4 text-right"><button class="text-brand-main font-bold hover:underline text-xs">编辑</button></td>
                            </tr>
                            <tr class="transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                                <td class="p-4">
                                    <div class="font-bold flex items-center gap-2">智谱 AI 官方 <span class="badge border-gray-500 text-[10px]">Zhipu</span></div>
                                    <div class="text-xs text-secondary mt-1 font-mono">https://open.bigmodel.cn</div>
                                </td>
                                <td class="p-4">
                                    <div class="flex gap-1 flex-wrap w-48">
                                        <span class="badge border border-gray-600 bg-transparent text-[10px]">glm-4</span>
                                        <span class="badge border border-gray-600 bg-transparent text-[10px]">glm-4v</span>
                                    </div>
                                </td>
                                <td class="p-4 text-center font-bold">2</td>
                                <td class="p-4 text-center font-mono text-brand-accent">158ms</td>
                                <td class="p-4 text-center"><span class="badge badge-success">启用</span></td>
                                <td class="p-4 text-right"><button class="text-brand-main font-bold hover:underline text-xs">编辑</button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
        """
    },
    "logs.html": {
        "title": "请求日志",
        "icon": "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8", # file-text
        "content": """
                <div class="flex items-center justify-between mb-8">
                    <div>
                        <h1 class="text-3xl font-bold tracking-tight">请求日志</h1>
                        <p class="text-secondary mt-1">全量 AI API 与 MCP 代理调用追踪与计费审计。</p>
                    </div>
                </div>
                
                <div class="card mb-6 flex flex-wrap gap-4 items-end bg-black/5 dark:bg-white/5 shadow-none">
                    <div class="space-y-2">
                        <label class="text-xs font-bold text-secondary uppercase tracking-widest">时间范围</label>
                        <select class="input-base w-48"><option>最近 24 小时</option></select>
                    </div>
                    <div class="space-y-2">
                        <label class="text-xs font-bold text-secondary uppercase tracking-widest">调用方 Key</label>
                        <input type="text" class="input-base w-48" placeholder="全网关">
                    </div>
                    <button class="btn-primary ml-auto">导出 CSV</button>
                </div>

                <div class="card p-0 overflow-hidden">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-black/5 dark:bg-white/5 border-b" style="border-color: var(--border-color)">
                            <tr>
                                <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider">请求时间</th>
                                <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider">调用方 (Key)</th>
                                <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider">模型 / 工具</th>
                                <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider">消耗 (Tokens)</th>
                                <th class="p-4 text-xs font-bold text-secondary uppercase tracking-wider text-right">状态</th>
                            </tr>
                        </thead>
                        <tbody class="text-sm">
                            <tr class="border-b transition-colors hover:bg-black/5 dark:hover:bg-white/5" style="border-color: var(--border-color)">
                                <td class="p-4 text-secondary">2026-04-29 13:12:45</td>
                                <td class="p-4 font-mono text-brand-main">ag-rd-a8f2</td>
                                <td class="p-4">claude-3-opus-20240229</td>
                                <td class="p-4 font-mono">1,245</td>
                                <td class="p-4 text-right"><span class="badge badge-success">200 OK</span></td>
                            </tr>
                            <tr class="transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                                <td class="p-4 text-secondary">2026-04-29 13:10:22</td>
                                <td class="p-4 font-mono text-brand-accent">ag-test-x1y2</td>
                                <td class="p-4">gpt-4o</td>
                                <td class="p-4 font-mono">-</td>
                                <td class="p-4 text-right"><span class="badge badge-warning">403 Quota</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
        """
    },
    "knowledge.html": {
        "title": "知识库 RAG",
        "icon": "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z", # book-open
        "content": """
                <div class="flex items-center justify-between mb-8">
                    <div>
                        <h1 class="text-3xl font-bold tracking-tight">知识库与 RAG 配置</h1>
                        <p class="text-secondary mt-1">管理企业私有文档数据，支持 Qdrant 向量化存储与多阶段混合检索。</p>
                    </div>
                    <button class="btn-primary">新建知识库</button>
                </div>
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="card col-span-1 lg:col-span-2">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="font-bold">运维规章手册 <span class="badge border-gray-500 ml-2">Qdrant</span></h3>
                            <button class="btn-secondary text-xs py-1 px-3">上传文档</button>
                        </div>
                        <div class="space-y-3">
                            <div class="flex items-center justify-between p-3 border rounded-lg" style="border-color: var(--border-color)">
                                <div class="flex items-center gap-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-brand-main"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                    <div>
                                        <div class="font-bold text-sm">2026_Q1_SLA_规范.pdf</div>
                                        <div class="text-xs text-secondary mt-1">1.2 MB · 解析成功 · 150 个分块</div>
                                    </div>
                                </div>
                                <span class="badge badge-success">Vectorized</span>
                            </div>
                        </div>
                    </div>
                    <div class="card col-span-1">
                        <h3 class="font-bold mb-4">检索策略配置</h3>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-xs font-bold text-secondary uppercase tracking-widest mb-1">分块策略 (Chunking)</label>
                                <select class="input-base"><option>512 Tokens (Overlap: 50)</option><option>1024 Tokens (Overlap: 100)</option></select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-secondary uppercase tracking-widest mb-1">混合检索 (Hybrid)</label>
                                <div class="flex items-center justify-between mt-2 text-sm text-secondary">
                                    <span>向量检索 + BM25</span>
                                    <input type="checkbox" checked class="rounded border-gray-500">
                                </div>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-secondary uppercase tracking-widest mb-1">Rerank (重排模型)</label>
                                <select class="input-base"><option>bge-reranker-large</option></select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-secondary uppercase tracking-widest mb-1">最终召回数量 (Top-K)</label>
                                <input type="number" class="input-base" value="5">
                            </div>
                            <button class="btn-primary w-full mt-2">保存策略</button>
                        </div>
                    </div>
                </div>
        """
    },
    "mcp.html": {
        "title": "MCP 市场",
        "icon": "M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4 M9 18c-4.51 2-5-2-7-2", # github (using as mcp icon)
        "content": """
                <div class="flex items-center justify-between mb-8">
                    <div>
                        <h1 class="text-3xl font-bold tracking-tight">MCP 工具市场</h1>
                        <p class="text-secondary mt-1">注册、管理符合 Model Context Protocol 的工具供 Agent 调用。</p>
                    </div>
                    <button class="btn-primary">注册外部工具</button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div class="card flex flex-col hover:-translate-y-1 transition-transform">
                        <div class="flex items-start gap-4 mb-4">
                            <div class="w-14 h-14 rounded-xl border flex items-center justify-center shadow-sm" style="background: var(--bg-body); border-color: var(--border-color); color: var(--text-primary)">
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
                            </div>
                            <div>
                                <h3 class="text-lg font-bold flex items-center gap-2">GitHub API <span class="badge badge-success">已启用</span></h3>
                                <p class="text-xs font-bold text-brand-main mt-1 uppercase tracking-widest font-mono">MCP:REMOTE</p>
                            </div>
                        </div>
                        <p class="text-sm text-secondary mb-6 flex-1">支持代码库搜索、Issue 管理、PR 审查等核心操作。</p>
                        <div class="border-t pt-4 flex justify-between items-center mt-auto" style="border-color: var(--border-color)">
                            <span class="text-xs font-bold text-secondary uppercase tracking-widest">近7天调用: <span style="color: var(--text-primary)">1.2k</span></span>
                            <button class="text-sm font-bold text-brand-main hover:underline">配置</button>
                        </div>
                    </div>
                </div>
        """
    },
    "agent.html": {
        "title": "Agent 体系",
        "icon": "M12 8V4H8 M20 14h2 M2 14h2 M15 13v2 M9 13v2 M4 8h16v12H4z", # bot
        "content": """
                <div class="flex items-center justify-between mb-8">
                    <div>
                        <h1 class="text-3xl font-bold tracking-tight">Agent 引擎</h1>
                        <p class="text-secondary mt-1">基于 LangGraph 编排智能体工作流，绑定企业私有知识库与 MCP 外部工具。</p>
                    </div>
                    <button class="btn-primary">编排新 Agent</button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="card" style="border-color: var(--brand-main); background: color-mix(in srgb, var(--brand-main) 5%, var(--bg-surface));">
                        <div class="flex items-start justify-between mb-4">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 rounded-2xl border-2 flex items-center justify-center" style="background: var(--bg-body); border-color: var(--brand-main); color: var(--brand-main); box-shadow: 0 4px 15px color-mix(in srgb, var(--brand-main) 20%, transparent);">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                                </div>
                                <div>
                                    <h2 class="text-xl font-bold flex items-center gap-2">AiGate Bot <span class="px-2 py-0.5 text-[10px] uppercase tracking-widest font-black rounded" style="background: var(--brand-main); color: var(--bg-body);">系统级</span></h2>
                                    <p class="text-xs font-medium text-secondary mt-1">内置管理助手，支持对话查询配额流向。</p>
                                </div>
                            </div>
                        </div>
                        <div class="flex flex-wrap gap-2 mb-4">
                            <span class="badge border-gray-500">工具: DB Schema</span>
                            <span class="badge border-gray-500">记忆: Checkpointer</span>
                        </div>
                        <button class="btn-primary w-full shadow-none text-xs py-2">对话体验</button>
                    </div>
                    
                    <div class="card border-l-4" style="border-left-color: var(--brand-accent);">
                        <div class="flex items-start justify-between mb-4">
                            <div>
                                <h3 class="text-lg font-bold">代码审查与规范审查助手</h3>
                                <p class="text-sm text-secondary mt-1">抓取 GitLab MR 并通过 RAG 查阅代码规范生成评论。</p>
                            </div>
                            <span class="badge badge-success">运行中</span>
                        </div>
                        <div class="flex flex-wrap gap-2 mb-4">
                            <span class="badge border-gray-500">MCP: GitLab</span>
                            <span class="badge border-gray-500">RAG: 规约手册</span>
                        </div>
                        <button class="btn-secondary w-full text-xs py-2">进入调试</button>
                    </div>
                </div>
        """
    },
    "alerts.html": {
        "title": "预警中心",
        "icon": "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01", # alert-triangle
        "content": """
                <div class="flex items-center justify-between mb-8">
                    <div>
                        <h1 class="text-3xl font-bold tracking-tight">预警中心</h1>
                        <p class="text-secondary mt-1">全局监控额度水位（70%/90%/100%）、密钥过期预警及 MCP 异常状态。</p>
                    </div>
                    <button class="btn-secondary">全部标记已读</button>
                </div>
                <div class="card p-0 overflow-hidden">
                    <ul class="divide-y" style="border-color: var(--border-color); divide-color: var(--border-color)">
                        <li class="p-4 flex gap-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <div class="text-brand-accent mt-1"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg></div>
                            <div class="flex-1">
                                <div class="flex justify-between">
                                    <h4 class="font-bold text-sm">租户配额预警 (90% 水位)</h4>
                                    <span class="text-xs text-secondary">10 分钟前</span>
                                </div>
                                <p class="text-sm text-secondary mt-1">「北京研发中心」本月 Token 配额已消耗 92%，即将触及熔断限制，请提醒租户管理员关注超额审批。</p>
                            </div>
                        </li>
                        <li class="p-4 flex gap-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <div class="text-brand-accent mt-1"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div>
                            <div class="flex-1">
                                <div class="flex justify-between">
                                    <h4 class="font-bold text-sm">员工密钥即将过期</h4>
                                    <span class="text-xs text-secondary">2 小时前</span>
                                </div>
                                <p class="text-sm text-secondary mt-1">架构部员工「张三」的 DEV 测试密钥 (ag-dev-3a1b...) 距离过期仅剩 3 天，请通知其轮换密钥。</p>
                            </div>
                        </li>
                    </ul>
                </div>
        """
    },
    "settings.html": {
        "title": "参数与预警配置",
        "icon": "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M12 8v4 M12 16h.01", # shield
        "content": """
                <div class="flex items-center justify-between mb-8">
                    <div>
                        <h1 class="text-3xl font-bold tracking-tight">参数与预警配置</h1>
                        <p class="text-secondary mt-1">全局系统参数、网关安全规则及预警通知触发配置（参考若依参数管理）。</p>
                    </div>
                    <button class="btn-primary">保存配置</button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="card space-y-6">
                        <h3 class="font-bold border-b pb-2 mb-4" style="border-color: var(--border-color)">预警规则与通知策略</h3>
                        <div>
                            <label class="block text-sm font-bold mb-2">额度熔断水位线 (%)</label>
                            <input type="range" class="w-full accent-brand-main" min="50" max="100" value="90">
                            <div class="flex justify-between text-xs text-secondary mt-1"><span>50%</span><span>触发告警: 90%</span><span>100% (自动熔断拦截)</span></div>
                        </div>
                        <div class="pt-2">
                            <label class="block text-sm font-bold mb-2">密钥过期预警提前量</label>
                            <select class="input-base"><option>提前 3 天</option><option>提前 7 天</option><option>提前 15 天</option></select>
                        </div>
                        <div class="pt-2">
                            <label class="block text-sm font-bold mb-2">通知接收渠道配置</label>
                            <div class="flex flex-col gap-3">
                                <label class="flex items-center justify-between text-sm p-3 border rounded-lg cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" style="border-color: var(--border-color)">
                                    <div class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg> 系统站内信 (顶栏弹窗)</div>
                                    <input type="checkbox" checked class="rounded border-gray-500">
                                </label>
                                <label class="flex items-center justify-between text-sm p-3 border rounded-lg cursor-pointer hover:bg-black/5 dark:hover:bg-white/5" style="border-color: var(--border-color)">
                                    <div class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg> 企业微信/钉钉 Webhook</div>
                                    <input type="checkbox" checked class="rounded border-gray-500">
                                </label>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-bold mb-2">Webhook URL</label>
                            <input type="text" class="input-base font-mono text-xs" value="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=abc...">
                        </div>
                    </div>
                    <div class="card space-y-6">
                        <h3 class="font-bold border-b pb-2 mb-4" style="border-color: var(--border-color)">系统参数 (Sys Params)</h3>
                        <div>
                            <div class="flex items-center justify-between">
                                <label class="block text-sm font-bold">允许普通用户自助注册 (sys.account.registerUser)</label>
                                <input type="checkbox" class="toggle">
                            </div>
                            <p class="text-xs text-secondary mt-1">开启后，内部员工可通过 SSO 自动注册并归属到默认租户组织。</p>
                        </div>
                        <div class="pt-4 border-t" style="border-color: var(--border-color)">
                            <div class="flex items-center justify-between">
                                <label class="block text-sm font-bold">强制 API Key 定期轮换 (sys.gateway.keyRotate)</label>
                                <input type="checkbox" checked class="toggle">
                            </div>
                            <p class="text-xs text-secondary mt-1">要求所有生成的 ag-{env}-{hex} 凭证在 90 天后自动过期。</p>
                        </div>
                        <div class="pt-4 border-t" style="border-color: var(--border-color)">
                            <div class="flex items-center justify-between">
                                <label class="block text-sm font-bold">启用高并发商业模式 (sys.gateway.commercialMode)</label>
                                <input type="checkbox" checked class="toggle">
                            </div>
                            <p class="text-xs text-secondary mt-1">开启后将关闭部分高开销日志中间件，优化底层吞吐量 (参考 CLIProxyAPI 设计)。</p>
                        </div>
                    </div>
                </div>
        """
    }
}

TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AiGate - {title}</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header class="master-nav" id="topHeader">
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 flex items-center justify-center font-bold text-lg" style="background: var(--brand-main); color: var(--bg-body); border-radius: var(--border-radius-base);">A</div>
            <span class="text-xl font-bold tracking-tight">AiGate <span class="text-secondary text-sm ml-1 font-normal">Enterprise</span></span>
        </div>
        
        <div class="flex items-center gap-6">
            <!-- 角色切换模拟器 -->
            <div class="hidden md:flex items-center gap-2 border-r pr-6" style="border-color: var(--border-color)">
                <span class="text-xs font-bold text-secondary uppercase tracking-widest">模拟身份:</span>
                <select id="roleSelector" class="input-base py-1 px-2 text-xs w-auto bg-transparent border-none font-bold" onchange="setRole(this.value)">
                    <option value="sys_admin">系统超管 (SYS)</option>
                    <option value="tenant_admin">租户管理 (TENANT)</option>
                    <option value="user">普通成员 (USER)</option>
                </select>
            </div>

            <!-- 消息/预警中心 铃铛 (弹窗模式) -->
            <div class="relative" id="alertDropdownContainer">
                <button onclick="document.getElementById('alertDropdown').classList.toggle('hidden')" class="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-secondary hover:text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    <span class="absolute top-2 right-2 w-2 h-2 bg-brand-accent rounded-full border border-bg-body"></span>
                </button>
                <!-- 下拉弹窗面板 -->
                <div id="alertDropdown" class="hidden absolute right-0 mt-2 w-80 card p-0 z-50 shadow-2xl flex flex-col border border-border-color">
                    <div class="p-4 border-b font-bold flex justify-between items-center" style="border-color: var(--border-color)">
                        系统预警与通知 <span class="badge badge-warning">2</span>
                    </div>
                    <div class="max-h-64 overflow-y-auto">
                        <div class="p-4 border-b hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors" style="border-color: var(--border-color)">
                            <div class="text-xs text-brand-accent font-bold mb-1 flex items-center justify-between">
                                <span>配额水位预警 (90%)</span>
                                <span class="text-secondary font-normal">10分钟前</span>
                            </div>
                            <div class="text-xs text-secondary mt-1 leading-relaxed">租户「北京研发中心」本月配额已消耗 92%，即将触及熔断限制。</div>
                        </div>
                        <div class="p-4 border-b hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors" style="border-color: var(--border-color)">
                            <div class="text-xs text-brand-accent font-bold mb-1 flex items-center justify-between">
                                <span>员工密钥即将过期</span>
                                <span class="text-secondary font-normal">2小时前</span>
                            </div>
                            <div class="text-xs text-secondary mt-1 leading-relaxed">员工「张三」的 DEV 测试密钥距离过期仅剩 3 天，请通知轮换。</div>
                        </div>
                    </div>
                    <a href="alerts.html" class="p-3 text-center text-xs font-bold text-secondary hover:text-primary transition-colors bg-black/5 dark:bg-white/5">查看全部记录</a>
                </div>
            </div>

            <!-- 全局主题切换 TAB -->
            <div class="theme-switch" id="themeSwitcher">
                <button class="theme-btn active" data-theme="dark">Dark</button>
                <button class="theme-btn" data-theme="light">Light</button>
                <button class="theme-btn" data-theme="apple">Apple</button>
            </div>
            <div class="w-8 h-8 border flex items-center justify-center text-sm font-bold bg-brand-main text-white cursor-pointer hover:opacity-80" style="border-radius: var(--border-radius-base); border-color: var(--border-color)" id="avatarInitial">AD</div>
        </div>
    </header>

    <div class="flex flex-1 overflow-hidden">
        <aside class="sidebar" id="mainSidebar">
            <!-- 参照 RuoYi-Vue 的系统管理分类 (中英文名并存，并且可折叠) -->
            <div class="nav-group py-2" data-roles="sys_admin,tenant_admin,user">
                <div class="nav-group-header" onclick="toggleNavGroup(this)">
                    <span>数据中心</span>
                    <svg class="transform transition-transform duration-200" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
                <div class="nav-items-container transition-all overflow-hidden">
                    {nav_dashboard}
                </div>
            </div>
            
            <div class="nav-group py-2 border-t" style="border-color: var(--border-color)" data-roles="sys_admin,tenant_admin">
                <div class="nav-group-header" onclick="toggleNavGroup(this)">
                    <span>系统管理</span>
                    <svg class="transform transition-transform duration-200" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
                <div class="nav-items-container transition-all overflow-hidden">
                    <div data-roles="sys_admin">{nav_org}</div>
                    {nav_users}
                    <div data-roles="sys_admin">{nav_settings}</div>
                </div>
            </div>
            
            <div class="nav-group py-2 border-t" style="border-color: var(--border-color)" data-roles="sys_admin,tenant_admin,user">
                <div class="nav-group-header" onclick="toggleNavGroup(this)">
                    <span>网关路由</span>
                    <svg class="transform transition-transform duration-200" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
                <div class="nav-items-container transition-all overflow-hidden">
                    <div data-roles="sys_admin">{nav_channels}</div>
                    {nav_keys}
                    {nav_logs}
                </div>
            </div>
            
            <div class="nav-group py-2 border-t" style="border-color: var(--border-color)" data-roles="sys_admin,tenant_admin,user">
                <div class="nav-group-header" onclick="toggleNavGroup(this)">
                    <span>AI 资产</span>
                    <svg class="transform transition-transform duration-200" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
                <div class="nav-items-container transition-all overflow-hidden">
                    <div data-roles="sys_admin,tenant_admin">{nav_knowledge}</div>
                    <div data-roles="sys_admin">{nav_mcp}</div>
                    {nav_agent}
                </div>
            </div>
        </aside>

        <main class="flex-1 overflow-y-auto p-6 lg:p-10 relative">
            <!-- Apple 风格专属的背景光晕 -->
            <div class="hidden apple:block absolute top-0 right-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl -z-10 mix-blend-multiply"></div>
            
            <div class="max-w-7xl mx-auto">
                {content}
            </div>
        </main>
    </div>

    <script>
        // Sidebar Menu Toggle Logic
        function toggleNavGroup(headerEl) {{
            const container = headerEl.nextElementSibling;
            const svg = headerEl.querySelector('svg');
            
            if (container.classList.contains('hidden')) {{
                container.classList.remove('hidden');
                svg.style.transform = 'rotate(0deg)';
            }} else {{
                container.classList.add('hidden');
                svg.style.transform = 'rotate(-90deg)';
            }}
        }}

        const html = document.documentElement;
        const btns = document.querySelectorAll('.theme-btn');
        
        function setTheme(theme) {{
            html.classList.remove('dark', 'light', 'apple');
            html.classList.add(theme);
            localStorage.setItem('aigate_theme', theme);
            
            btns.forEach(btn => {{
                if(btn.dataset.theme === theme) btn.classList.add('active');
                else btn.classList.remove('active');
            }});
        }}

        const savedTheme = localStorage.getItem('aigate_theme') || 'dark';
        setTheme(savedTheme);

        btns.forEach(btn => {{
            btn.addEventListener('click', () => setTheme(btn.dataset.theme));
        }});

        // Role Management Logic
        function setRole(role) {{
            localStorage.setItem('aigate_role', role);
            applyRole(role);
        }}

        function applyRole(role) {{
            // Update dropdown
            const selector = document.getElementById('roleSelector');
            if(selector) selector.value = role;

            // Update Avatar
            const avatar = document.getElementById('avatarInitial');
            if(avatar) {{
                if(role === 'sys_admin') avatar.innerText = 'AD';
                if(role === 'tenant_admin') avatar.innerText = 'TE';
                if(role === 'user') avatar.innerText = 'US';
            }}

            // Filter DOM elements based on role
            document.querySelectorAll('[data-roles]').forEach(el => {{
                const allowedRoles = el.getAttribute('data-roles').split(',');
                if(allowedRoles.includes(role)) {{
                    el.style.display = '';
                }} else {{
                    el.style.display = 'none';
                }}
            }});

            // Toggle specific text views
            document.querySelectorAll('.view-sys-admin').forEach(el => el.classList.toggle('hidden', role !== 'sys_admin'));
            document.querySelectorAll('.view-tenant-admin').forEach(el => el.classList.toggle('hidden', role !== 'tenant_admin'));
            
            // Hide Sidebar and Header on Login page
            if(window.location.pathname.includes('login.html')) {{
                if(document.getElementById('topHeader')) document.getElementById('topHeader').style.display = 'none';
                if(document.getElementById('mainSidebar')) document.getElementById('mainSidebar').style.display = 'none';
            }}
        }}

        const savedRole = localStorage.getItem('aigate_role') || 'sys_admin';
        applyRole(savedRole);
    </script>
</body>
</html>
"""

def generate():
    for filename, data in PAGES.items():
        # Generate Nav links
        navs = {}
        for fname, fdata in PAGES.items():
            active_class = " active" if fname == filename else ""
            nav_html = f'<a href="{fname}" class="nav-item{active_class}"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="{fdata["icon"]}"/></svg>{fdata["title"]}</a>'
            
            # map filename to nav key
            key = fname.split('.')[0]
            if key == "organization": key = "org"
            navs[f"nav_{key}"] = nav_html

        final_html = TEMPLATE.format(
            title=data["title"],
            content=data["content"],
            **navs
        )

        with open(os.path.join(BASE_DIR, filename), "w", encoding="utf-8") as f:
            f.write(final_html)
            
    print("Done generating polished pages!")

if __name__ == "__main__":
    generate()
