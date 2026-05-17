# -*- coding: utf-8 -*-
"""
v1.3 增量补丁脚本：
1. 在「AI 资产」分组中，将 knowledge.html 前面插入「提示词库」入口
2. 将「知识库 RAG」改名为「知识库」
3. 将「MCP 市场」改名为「MCP 工具」
4. 将「技能库」「插件市场」「Hooks 钩子」分别加上 `Skills / Plugins / Hooks` 前缀，明确为资产市场

后续 v1.4 再做侧栏分组重构（移除个人中心、新增系统设置等）。本次只做 AI 资产分组内增量，不破坏现有页面结构。
"""
import os
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

PROMPTS_NAV_HTML = (
    '<div data-roles="sys_admin,tenant_admin,user"><a href="prompts.html" class="nav-item">'
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" '
    'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>'
    '<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'
    '<path d="M9 7h6 M9 11h4"/>'
    '</svg>提示词库</a></div>'
)

# 找到 knowledge.html 那一行，在其前插入 prompts 入口
KNOWLEDGE_LINE_PATTERN = re.compile(
    r'(<div data-roles="[^"]*"><a href="knowledge\.html"[^>]*class="nav-item[^"]*"[^>]*>.*?</a></div>)',
    re.S,
)

RENAME_PAIRS = [
    ("知识库 RAG", "知识库"),
    ("MCP 市场", "MCP 工具"),
    (">技能库</a>", ">Skills 技能库</a>"),
    (">插件市场</a>", ">Plugins 插件库</a>"),
    (">Hooks 钩子</a>", ">Hooks 钩子库</a>"),
]


def patch_file(path: str) -> bool:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    original = content

    # 1. 重命名
    for old, new in RENAME_PAIRS:
        content = content.replace(old, new)

    # 2. 在 knowledge.html 之前插入 prompts 入口（仅插入一次，防止重复）
    if 'href="prompts.html"' not in content:
        m = KNOWLEDGE_LINE_PATTERN.search(content)
        if m:
            insert_at = m.start()
            content = content[:insert_at] + PROMPTS_NAV_HTML + "\n                    " + content[insert_at:]

    if content != original:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return True
    return False


def main():
    files = [
        f
        for f in os.listdir(BASE_DIR)
        if f.endswith(".html") and f not in ("design-system.html",)
    ]
    changed = 0
    for filename in sorted(files):
        path = os.path.join(BASE_DIR, filename)
        if patch_file(path):
            print(f"  patched: {filename}")
            changed += 1
        else:
            print(f"  skipped: {filename}")
    print(f"\nDone. {changed}/{len(files)} files updated.")


if __name__ == "__main__":
    main()
