"""
为 hooks / plugins / skills 三个新页面补充侧边栏 AI 资产分组导航项
"""
import os

BASE_DIR = r"d:\workspace\XYTX\AiGate\ui"

NAV_ITEMS = [
    ("hooks.html", "Hooks 钩子", "M13 10V3L4 14h7v7l9-11h-7z"),
    ("plugins.html", "插件市场", "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z M7 7h.01"),
    ("skills.html", "技能库", "M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"),
]

html_files = [f for f in os.listdir(BASE_DIR) if f.endswith('.html') and f != 'design-system.html']

for filename in html_files:
    filepath = os.path.join(BASE_DIR, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    changed = False
    for href, title, icon in NAV_ITEMS:
        if f'href="{href}"' not in content:
            active = ' active' if href == filename else ''
            nav_html = f'<a href="{href}" class="nav-item{active}"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="{icon}"/></svg>{title}</a>'
            # Insert after agent.html nav link
            marker = 'href="agent.html"'
            if marker in content:
                idx = content.rfind(marker)
                end_a = content.find('</a>', idx) + 4
                content = content[:end_a] + '\n' + nav_html + content[end_a:]
                changed = True

    if changed:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  Nav updated: {filename}")

print("Done!")
