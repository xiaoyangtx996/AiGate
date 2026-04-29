"""
Patch 3: 向所有已生成的 HTML 页面注入
  1. 侧边栏新增菜单项 (模型管理、消耗报表、个人中心)
  2. 全局悬浮 AI 对话机器人 Widget
"""
import os, re

BASE_DIR = r"d:\workspace\XYTX\AiGate\ui"

# 悬浮 AI 对话机器人 HTML (插入 </body> 前)
CHAT_WIDGET = """
<!-- 悬浮 AI 对话机器人 -->
<div id="aiChatBtn" onclick="toggleChat()" style="position:fixed;bottom:32px;right:32px;z-index:1000;width:52px;height:52px;border-radius:50%;background:var(--brand-main);color:var(--bg-body);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,0.3);transition:transform 0.2s ease;" onmouseenter="this.style.transform='scale(1.1)'" onmouseleave="this.style.transform='scale(1)'">
  <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
</div>
<div id="aiChatPanel" style="display:none;position:fixed;bottom:96px;right:32px;z-index:1000;width:380px;height:520px;border-radius:1rem;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.4);background:var(--bg-surface);border:1px solid var(--border-color);display:none;flex-direction:column;">
  <div style="background:var(--brand-main);padding:16px 20px;display:flex;align-items:center;justify-content:space-between;">
    <div style="display:flex;align-items:center;gap:10px;color:var(--bg-body);">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
      <div><div style="font-weight:700;font-size:14px;">AiGate Bot</div><div style="font-size:11px;opacity:0.8;">选择知识库开始对话</div></div>
    </div>
    <button onclick="toggleChat()" style="background:transparent;border:none;color:var(--bg-body);cursor:pointer;opacity:0.8;">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </div>
  <div style="padding:12px 16px;border-bottom:1px solid var(--border-color);display:flex;gap:8px;align-items:center;">
    <select style="flex:1;padding:6px 10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-body);color:var(--text-primary);font-size:12px;">
      <option>全局 (不限知识库)</option>
      <option>产品设计文档</option>
      <option>SLA 运维手册</option>
    </select>
    <select style="padding:6px 10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-body);color:var(--text-primary);font-size:12px;">
      <option>gpt-4o</option>
      <option>claude-3-5-sonnet</option>
    </select>
  </div>
  <div id="chatMessages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;">
    <div style="display:flex;gap:10px;align-items:flex-start;">
      <div style="width:28px;height:28px;border-radius:50%;background:var(--brand-main);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--bg-body)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
      </div>
      <div style="background:var(--bg-body);border:1px solid var(--border-color);border-radius:0 12px 12px 12px;padding:10px 14px;font-size:13px;max-width:80%;line-height:1.6;color:var(--text-primary);">
        你好！我是 AiGate Bot，可以帮你查询配额、调用日志，或根据选定知识库回答问题。
      </div>
    </div>
  </div>
  <div style="padding:12px 16px;border-top:1px solid var(--border-color);display:flex;gap:8px;">
    <input id="chatInput" type="text" placeholder="输入问题，按 Enter 发送..." style="flex:1;padding:10px 14px;border-radius:10px;border:1px solid var(--border-color);background:var(--bg-body);color:var(--text-primary);font-size:13px;outline:none;" onkeydown="if(event.key==='Enter')sendChat()">
    <button onclick="sendChat()" style="padding:8px 16px;border-radius:10px;background:var(--brand-main);color:var(--bg-body);border:none;font-weight:700;cursor:pointer;font-size:13px;">发送</button>
  </div>
</div>
<script>
function toggleChat(){{
  var p=document.getElementById('aiChatPanel');
  p.style.display=p.style.display==='none'||p.style.display===''?'flex':'none';
}}
function sendChat(){{
  var input=document.getElementById('chatInput');
  var msg=input.value.trim();
  if(!msg)return;
  var messages=document.getElementById('chatMessages');
  messages.innerHTML+='<div style="display:flex;justify-content:flex-end;"><div style="background:var(--brand-main);color:var(--bg-body);border-radius:12px 0 12px 12px;padding:10px 14px;font-size:13px;max-width:80%;line-height:1.6;">'+msg+'</div></div>';
  input.value='';
  setTimeout(function(){{
    messages.innerHTML+='<div style="display:flex;gap:10px;align-items:flex-start;"><div style="width:28px;height:28px;border-radius:50%;background:var(--brand-main);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"14\\" height=\\"14\\" viewBox=\\"0 0 24 24\\" fill=\\"none\\" stroke=\\"var(--bg-body)\\" stroke-width=\\"2\\" stroke-linecap=\\"round\\" stroke-linejoin=\\"round\\"><path d=\\"M12 8V4H8\\"/><rect width=\\"16\\" height=\\"12\\" x=\\"4\\" y=\\"8\\" rx=\\"2\\"/></svg></div><div style=\\"background:var(--bg-body);border:1px solid var(--border-color);border-radius:0 12px 12px 12px;padding:10px 14px;font-size:13px;max-width:80%;line-height:1.6;color:var(--text-primary);\\">[演示] 已收到您的问题，正在检索知识库并生成回答...</div></div>';
    messages.scrollTop=messages.scrollHeight;
  }},800);
  messages.scrollTop=messages.scrollHeight;
}}
</script>
"""

# 新侧边栏导航项（模型管理、消耗报表、个人中心）
NEW_NAV_ITEMS = {
    "models.html": ("模型资产", "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z", "sys_admin"),
    "billing.html": ("消耗报表", "M3 3v18h18 M18 17V9 M13 17V5 M8 17v-3", "sys_admin,tenant_admin"),
    "profile.html": ("个人中心", "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "sys_admin,tenant_admin,user"),
}

def make_nav_item(href, title, icon_path, current_file=""):
    active = ' active' if href == current_file else ''
    return f'<a href="{href}" class="nav-item{active}"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="{icon_path}"/></svg>{title}</a>'

html_files = [f for f in os.listdir(BASE_DIR) if f.endswith('.html') and f != 'design-system.html']

for filename in html_files:
    filepath = os.path.join(BASE_DIR, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. 注入悬浮机器人 (如果还没有)
    if 'aiChatBtn' not in content:
        content = content.replace('</body>', CHAT_WIDGET + '\n</body>')

    # 2. 在 AI 资产 nav-group 之前插入模型管理到网关路由分组
    # 在 nav_channels 后面的 div 中添加模型管理 (仅 sys_admin)
    models_nav = make_nav_item("models.html", "模型资产", "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z", filename)
    billing_nav = make_nav_item("billing.html", "消耗报表", "M3 3v18h18 M18 17V9 M13 17V5 M8 17v-3", filename)
    profile_nav = make_nav_item("profile.html", "个人中心", "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", filename)

    # Insert models after channels nav group (find the nav_logs closing tag)
    models_html = f'<div data-roles="sys_admin">{models_nav}</div>'
    billing_html = f'<div data-roles="sys_admin,tenant_admin">{billing_nav}</div>'
    profile_html = f'<div data-roles="sys_admin,tenant_admin,user">{profile_nav}</div>'

    # Add after logs.html nav item if not present
    if 'models.html' not in content:
        # Find closing tag of gateway nav group
        insert_marker = 'href="logs.html"'
        if insert_marker in content:
            idx = content.find('</a>', content.find(insert_marker)) + 4
            content = content[:idx] + '\n' + models_html + '\n' + billing_html + content[idx:]

    if 'profile.html' not in content:
        # Add profile before </aside>
        content = content.replace('</aside>', profile_html + '\n</aside>')

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  Updated: {filename}")

print("Patch 3 done!")
