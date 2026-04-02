import json
from typing import Any


POST_WORKFLOW_DEBUG = True


def _safe_json(value: Any):
    try:
        return json.loads(json.dumps(value, default=str))
    except Exception:
        return str(value)


def log_post_workflow_debug(label: str, payload: Any) -> None:
    if not POST_WORKFLOW_DEBUG:
        return

    print(f"[post-workflow-debug] {label}")
    print(json.dumps(_safe_json(payload), indent=2, ensure_ascii=False))
