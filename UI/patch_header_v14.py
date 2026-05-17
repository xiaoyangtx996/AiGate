# -*- coding: utf-8 -*-
"""
v1.4 顶栏重构补丁：
1. 移除 master-nav 中的 theme-switch、模拟身份、原 avatar
2. 替换为一个全新的 Avatar Dropdown（通过 Tailwind / inline JS 控制显隐）
3. 添加下拉菜单结构：张三信息、5 个 Drawer 入口、主题切换、角色切换（仅演示）、系统状态、退出
"""
import os
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 原始的右上角区域大概是这样的：
# <div class="flex items-center gap-6"> ... <div class="w-8 h-8 border ... id="avatarInitial">AD</div> </div>

NEW_HEADER_RIGHT = """<div class="flex items-center gap-4">
            <!-- 预警铃铛 -->
            <div class="relative" id="alertDropdownContainer">
                <button onclick="document.getElementById('alertDropdown').classList.toggle('hidden')" class="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-secondary hover:text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    <span class="absolute top-2 right-2 w-2 h-2 bg-brand-accent rounded-full border border-bg-body"></span>
                </button>
                <div id="alertDropdown" class="hidden absolute right-0 mt-2 w-80 card p-0 z-50 shadow-2xl flex flex-col border border-border-color">
                    <div class="p-4 border-b font-bold flex justify-between items-center" style="border-color: var(--border-color)">
                        系统预警与通知 <span class="badge badge-warning">2</span>
                    </div>
                    <div class="max-h-64 overflow-y-auto">
                        <div class="p-4 border-b hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors" style="border-color: var(--border-color)">
                            <div class="text-xs text-brand-accent font-bold mb-1 flex items-center justify-between"><span>配额水位预警 (90%)</span><span class="text-secondary font-normal">10分钟前</span></div>
                            <div class="text-xs text-secondary mt-1">租户「北京研发中心」本月配额已消耗 92%，即将触及熔断限制。</div>
                        </div>
                    </div>
                    <a href="alerts.html" class="p-3 text-center text-xs font-bold text-secondary hover:text-primary transition-colors bg-black/5 dark:bg-white/5">查看全部</a>
                </div>
            </div>

            <!-- 头像下拉 -->
            <div class="relative" id="avatarDropdownContainer">
                <button onclick="document.getElementById('avatarDropdown').classList.toggle('hidden')" class="w-8 h-8 border flex items-center justify-center text-sm font-bold bg-brand-main text-white cursor-pointer hover:opacity-80 transition-opacity" style="border-radius: var(--border-radius-base); border-color: var(--border-color)" id="avatarInitial">AD</button>
                
                <div id="avatarDropdown" class="hidden absolute right-0 mt-2 w-64 card p-0 z-50 shadow-2xl flex flex-col border border-border-color text-sm">
                    <div class="p-4 border-b" style="border-color: var(--border-color)">
                        <div class="font-bold">张三 <span class="text-xs text-brand-main ml-1 bg-brand-main/10 px-1 rounded">SYS</span></div>
                        <div class="text-xs text-secondary mt-1">集团 IT 管理员 · 北京研发中心</div>
                    </div>
                    
                    <div class="p-2 border-b" style="border-color: var(--border-color)">
                        <a href="profile.html?tab=basic" class="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-secondary hover:text-primary transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> 个人资料</a>
                        <a href="profile.html?tab=keys" class="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-secondary hover:text-primary transition-colors" data-roles="sys_admin,tenant_admin,user"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg> 我的密钥 <span class="ml-auto text-xs font-mono">2/3</span></a>
                        <a href="profile.html?tab=usage" class="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-secondary hover:text-primary transition-colors view-user-only" style="display:none;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18 M18 17V9 M13 17V5 M8 17v-3"/></svg> 我的用量</a>
                        <a href="profile.html?tab=notifications" class="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-secondary hover:text-primary transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg> 通知偏好</a>
                        <a href="profile.html?tab=security" class="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-secondary hover:text-primary transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> 安全设置</a>
                    </div>
                    
                    <div class="p-2 border-b" style="border-color: var(--border-color)">
                        <div class="group relative px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-secondary hover:text-primary transition-colors cursor-pointer flex justify-between items-center" data-roles="sys_admin">
                            <div class="flex items-center gap-3"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> 切换租户视角</div>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                        <div class="group relative px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-secondary hover:text-primary transition-colors cursor-pointer flex justify-between items-center" title="仅演示环境可见">
                            <div class="flex items-center gap-3"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h10"/><path d="M9 4v16"/><path d="M17 2l5 5-5 5"/><path d="M17 12l5 5-5 5"/></svg> 模拟角色</div>
                            <select id="roleSelector" class="bg-transparent border-none outline-none cursor-pointer font-bold text-xs" onchange="setRole(this.value); document.getElementById('avatarDropdown').classList.add('hidden');">
                                <option value="sys_admin">SYS</option>
                                <option value="tenant_admin">TENANT</option>
                                <option value="user">USER</option>
                            </select>
                        </div>
                        <div class="flex items-center justify-between px-3 py-2 rounded-md text-secondary">
                            <div class="flex items-center gap-3"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg> 主题</div>
                            <div class="flex bg-black/5 dark:bg-white/5 rounded-md p-0.5">
                                <button class="theme-btn active rounded px-2 py-0.5 text-xs font-bold" data-theme="dark" onclick="setTheme('dark')">Dark</button>
                                <button class="theme-btn rounded px-2 py-0.5 text-xs font-bold" data-theme="light" onclick="setTheme('light')">Light</button>
                                <button class="theme-btn rounded px-2 py-0.5 text-xs font-bold" data-theme="apple" onclick="setTheme('apple')">Apple</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="p-2">
                        <a href="status.html" class="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-secondary hover:text-primary transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> 系统状态</a>
                        <a href="login.html" class="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-red-500/10 text-red-500 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> 退出登录</a>
                    </div>
                </div>
            </div>
        </div>"""

PATTERN = re.compile(r'<div class="flex items-center gap-6">.*?id="avatarInitial">.*?</div>\s*</div>', re.S)

# 点击非菜单区域隐藏 dropdown 的全局 JS
DROPDOWN_CLOSE_JS = """
        // 点击外部关闭弹窗
        document.addEventListener('click', (e) => {
            const avatarBtn = document.getElementById('avatarDropdownContainer');
            if (avatarBtn && !avatarBtn.contains(e.target)) {
                const dropdown = document.getElementById('avatarDropdown');
                if (dropdown && !dropdown.classList.contains('hidden')) {
                    dropdown.classList.add('hidden');
                }
            }
            
            const alertBtn = document.getElementById('alertDropdownContainer');
            if (alertBtn && !alertBtn.contains(e.target)) {
                const alertDrop = document.getElementById('alertDropdown');
                if (alertDrop && !alertDrop.classList.contains('hidden')) {
                    alertDrop.classList.add('hidden');
                }
            }
        });
"""

def patch_file(path: str) -> bool:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    original = content

    content = PATTERN.sub(NEW_HEADER_RIGHT, content)
    
    if "document.addEventListener('click', (e) => {" not in content:
        content = content.replace("</script>", DROPDOWN_CLOSE_JS + "\n    </script>")

    if content != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return True
    return False

def main():
    files = [f for f in os.listdir(BASE_DIR) if f.endswith(".html") and f not in ("design-system.html", "login.html")]
    changed = 0
    for filename in sorted(files):
        path = os.path.join(BASE_DIR, filename)
        if patch_file(path):
            print(f"  patched: {filename}")
            changed += 1
    print(f"\\nDone. {changed}/{len(files)} files updated header.")

if __name__ == "__main__":
    main()
