"""Build navigation trees for web-source KBs."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


# -- flat-to-tree conversion -------------------------------------------


def flat_to_tree(
    links: list[dict],
    url_to_file: dict[str, str],
) -> list[dict]:
    """Convert a flat list of navigation links into a nested tree.

    Uses the ``depth`` field to determine nesting.  Links at depth N
    become children of the most recent link at depth N-1.
    """
    result: list[dict] = []
    stack: list[tuple[int, dict]] = []
    counter = 0

    for link in links:
        depth = link.get("depth", 0)
        title = link.get("title", "Untitled")
        url = link.get("url", "")
        file_path = url_to_file.get(url, "")

        node: dict[str, Any] = {
            "id": f"nav-{counter}",
            "title": title,
            "url": url,
            "file_path": file_path,
            "children": [],
        }
        counter += 1

        while stack and stack[-1][0] >= depth:
            stack.pop()

        if stack:
            stack[-1][1]["children"].append(node)
        else:
            result.append(node)

        stack.append((depth, node))

    return result


def build_navigation_manifest(
    nav_links: list[dict],
    nav_kind: str,
    page_urls: dict[str, str],
) -> dict:
    """Build a serializable navigation manifest from crawl output.

    Returns ``{"kind": str, "nodes": [...]}``.
    """
    if not nav_links:
        return {"kind": "", "nodes": []}

    url_to_file: dict[str, str] = {}
    for fname, url in page_urls.items():
        url_to_file[url] = fname

    nodes = flat_to_tree(nav_links, url_to_file)
    return {"kind": nav_kind or "inferred", "nodes": nodes}
