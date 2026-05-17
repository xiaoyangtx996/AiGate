# -*- coding: utf-8 -*-
"""
v1.4 侧边栏重构补丁：
1. 删除“个人中心”侧栏入口（已移至顶栏头像）
2. 将“AI 资产”分为：
   - 📚 知识库（单独一级，放网关下面）
   - 📦 AI 资产市场（含：提示词库, MCP, Skills, Plugins, Hooks）
   - 🤖 Agent 中心（单独一级）
3. 增加新的未实现占位：
   - 办公台（数据中心）
   - 超额审批（系统管理）
   - 套餐计费（系统管理）
   - 操作审计（预警组）
"""
import os
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 我们直接整体替换侧边栏内容（从 <aside class="sidebar" id="mainSidebar"> 到 </aside>）
NEW_SIDEBAR_HTML = """<aside class="sidebar" id="mainSidebar">
            <div class="nav-group py-2" data-roles="sys_admin,tenant_admin,user">
                <div class="nav-group-header" onclick="toggleNavGroup(this)">
                    <span>数据中心</span>
                    <svg class="transform transition-transform duration-200" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
                <div class="nav-items-container transition-all overflow-hidden">
                    <a href="dashboard.html" class="nav-item"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18 M18 17V9 M13 17V5 M8 17v-3"/></svg>数据大盘</a>
                    <a href="my-workspace.html" class="nav-item view-user-only" style="display:none;"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>我的工作台</a>
                </div>
            </div>
            
            <div class="nav-group py-2 border-t" style="border-color: var(--border-color)" data-roles="sys_admin,tenant_admin">
                <div class="nav-group-header" onclick="toggleNavGroup(this)">
                    <span>组织治理</span>
                    <svg class="transform transition-transform duration-200" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
                <div class="nav-items-container transition-all overflow-hidden">
                    <div data-roles="sys_admin"><a href="organization.html" class="nav-item"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75"/></svg>组织与配额</a></div>
                    <a href="users.html" class="nav-item"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>用户管理</a>
                    <a href="quota-approval.html" class="nav-item"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/></svg>配额审批</a>
                    <div data-roles="sys_admin"><a href="subscription.html" class="nav-item"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 15h0M2 9.5h20"/></svg>套餐计费</a></div>
                </div>
            </div>
            
            <div class="nav-group py-2 border-t" style="border-color: var(--border-color)" data-roles="sys_admin,tenant_admin,user">
                <div class="nav-group-header" onclick="toggleNavGroup(this)">
                    <span>网关接入</span>
                    <svg class="transform transition-transform duration-200" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
                <div class="nav-items-container transition-all overflow-hidden">
                    <div data-roles="sys_admin"><a href="channels.html" class="nav-item"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12"/></svg>渠道管理</a></div>
                    <a href="keys.html" class="nav-item"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>密钥管理</a>
                    <a href="logs.html" class="nav-item"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8"/></svg>请求日志</a>
                    <div data-roles="sys_admin"><a href="models.html" class="nav-item"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>模型资产</a></div>
                    <div data-roles="sys_admin,tenant_admin"><a href="billing.html" class="nav-item"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18 M18 17V9 M13 17V5 M8 17v-3"/></svg>消耗报表</a></div>
                </div>
            </div>

            <div class="nav-group py-2 border-t" style="border-color: var(--border-color)" data-roles="sys_admin,tenant_admin,user">
                <div class="nav-group-header" onclick="toggleNavGroup(this)">
                    <span>知识库</span>
                    <svg class="transform transition-transform duration-200" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
                <div class="nav-items-container transition-all overflow-hidden">
                    <div data-roles="sys_admin,tenant_admin,user"><a href="knowledge.html" class="nav-item"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>项目知识库</a></div>
                </div>
            </div>

            <div class="nav-group py-2 border-t" style="border-color: var(--border-color)" data-roles="sys_admin,tenant_admin,user">
                <div class="nav-group-header" onclick="toggleNavGroup(this)">
                    <span>AI 资产市场</span>
                    <svg class="transform transition-transform duration-200" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
                <div class="nav-items-container transition-all overflow-hidden">
                    <div data-roles="sys_admin,tenant_admin,user"><a href="prompts.html" class="nav-item"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 7h6 M9 11h4"/></svg>提示词库</a></div>
                    <div data-roles="sys_admin,tenant_admin,user"><a href="mcp.html" class="nav-item"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4 M9 18c-4.51 2-5-2-7-2"/></svg>MCP 工具</a></div>
                    <div data-roles="sys_admin,tenant_admin,user"><a href="skills.html" class="nav-item"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>Skills 技能</a></div>
                    <div data-roles="sys_admin,tenant_admin,user"><a href="plugins.html" class="nav-item"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z M7 7h.01"/></svg>Plugins 插件</a></div>
                    <div data-roles="sys_admin,tenant_admin"><a href="hooks.html" class="nav-item"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>Hooks 钩子</a></div>
                </div>
            </div>

            <div class="nav-group py-2 border-t" style="border-color: var(--border-color)" data-roles="sys_admin,tenant_admin,user">
                <div class="nav-group-header" onclick="toggleNavGroup(this)">
                    <span>Agent 中心</span>
                    <svg class="transform transition-transform duration-200" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
                <div class="nav-items-container transition-all overflow-hidden">
                    <div data-roles="sys_admin,tenant_admin,user"><a href="agent.html" class="nav-item"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8 M20 14h2 M2 14h2 M15 13v2 M9 13v2 M4 8h16v12H4z"/></svg>智能体编排</a></div>
                </div>
            </div>

            <div class="nav-group py-2 border-t" style="border-color: var(--border-color)" data-roles="sys_admin,tenant_admin,user">
                <div class="nav-group-header" onclick="toggleNavGroup(this)">
                    <span>监控合规</span>
                    <svg class="transform transition-transform duration-200" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
                <div class="nav-items-container transition-all overflow-hidden">
                    <div data-roles="sys_admin,tenant_admin,user"><a href="alerts.html" class="nav-item"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>预警中心</a></div>
                    <div data-roles="sys_admin"><a href="audit.html" class="nav-item"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M12 8v4 M12 16h.01"/></svg>操作审计</a></div>
                </div>
            </div>
            
            <div class="nav-group py-2 border-t" style="border-color: var(--border-color)" data-roles="sys_admin,tenant_admin">
                <div class="nav-group-header" onclick="toggleNavGroup(this)">
                    <span>系统设置</span>
                    <svg class="transform transition-transform duration-200" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
                <div class="nav-items-container transition-all overflow-hidden">
                    <a href="settings.html" class="nav-item"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>全局配置</a>
                </div>
            </div>
        </aside>"""

# 寻找对应的 filename 匹配并加 active class
def get_active_sidebar(filename):
    # 将所有的 class="nav-item" 加上 active 如果 href="filename"
    html = NEW_SIDEBAR_HTML.replace(f'href="{filename}" class="nav-item"', f'href="{filename}" class="nav-item active"')
    return html

PATTERN = re.compile(r'<aside class="sidebar" id="mainSidebar">.*?</aside>', re.S)

def patch_file(path: str, filename: str) -> bool:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    original = content

    active_sidebar = get_active_sidebar(filename)
    content = PATTERN.sub(active_sidebar, content)

    if content != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return True
    return False

def main():
    files = [f for f in os.listdir(BASE_DIR) if f.endswith(".html") and f not in ("design-system.html",)]
    changed = 0
    for filename in sorted(files):
        path = os.path.join(BASE_DIR, filename)
        if patch_file(path, filename):
            print(f"  patched: {filename}")
            changed += 1
    print(f"\\nDone. {changed}/{len(files)} files updated sidebar.")

if __name__ == "__main__":
    main()
