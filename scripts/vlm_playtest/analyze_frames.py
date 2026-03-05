#!/usr/bin/env python3
import argparse
import base64
import json
import os
import sys
import time
from pathlib import Path
from urllib import request

SYSTEM_PROMPT = (
    "You analyze gameplay screenshots and return strict JSON only. "
    "Focus on objective observations useful for game QA and balance tuning."
)

USER_PROMPT = (
    "Analyze this gameplay frame. Return JSON with keys: "
    "scene_summary (string), hud_state (string), player_state (string), "
    "events (array of short strings), issues (array of short strings), "
    "fun_moments (array of short strings), confidence (0-1 number). "
    "Do not include markdown."
)


def b64(path: Path) -> str:
    with path.open("rb") as f:
        return base64.b64encode(f.read()).decode("ascii")


def generate(host: str, model: str, image_path: Path, timeout: int) -> str:
    payload = {
        "model": model,
        "stream": False,
        "system": SYSTEM_PROMPT,
        "prompt": USER_PROMPT,
        "images": [b64(image_path)],
        "options": {
            "temperature": 0.2,
            "top_p": 0.9,
        },
    }
    data = json.dumps(payload).encode("utf-8")
    req = request.Request(
        url=f"{host.rstrip('/')}/api/generate",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with request.urlopen(req, timeout=timeout) as resp:
        body = resp.read().decode("utf-8")
    obj = json.loads(body)
    return obj.get("response", "")


def parse_json(text: str):
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        text = text.replace("json", "", 1).strip()
    return json.loads(text)


def summarize(results):
    issue_count = {}
    event_count = {}
    fun_count = {}

    for row in results:
        for item in row.get("issues", []) or []:
            issue_count[item] = issue_count.get(item, 0) + 1
        for item in row.get("events", []) or []:
            event_count[item] = event_count.get(item, 0) + 1
        for item in row.get("fun_moments", []) or []:
            fun_count[item] = fun_count.get(item, 0) + 1

    def top_n(d, n=10):
        return sorted(
            [{"text": k, "count": v} for k, v in d.items()],
            key=lambda x: (-x["count"], x["text"]),
        )[:n]

    return {
        "total_frames": len(results),
        "top_issues": top_n(issue_count),
        "top_events": top_n(event_count),
        "top_fun_moments": top_n(fun_count),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--frames", required=True, help="Directory containing frame_*.jpg")
    ap.add_argument("--out", required=True, help="Output json path")
    ap.add_argument("--model", default="qwen3-vl:4b")
    ap.add_argument("--host", default="http://127.0.0.1:11434")
    ap.add_argument("--sample-every", type=int, default=2)
    ap.add_argument("--max-frames", type=int, default=120)
    ap.add_argument("--timeout", type=int, default=120)
    args = ap.parse_args()

    frame_dir = Path(args.frames)
    out_path = Path(args.out)
    if not frame_dir.exists():
        print(f"frames dir not found: {frame_dir}", file=sys.stderr)
        sys.exit(1)

    images = sorted(frame_dir.glob("frame_*.jpg"))
    images = images[:: max(1, args.sample_every)]
    images = images[: args.max_frames]

    if not images:
        print("no frames found", file=sys.stderr)
        sys.exit(1)

    results = []
    for idx, path in enumerate(images, start=1):
        t0 = time.time()
        try:
            text = generate(args.host, args.model, path, args.timeout)
            parsed = parse_json(text)
            parsed["frame"] = path.name
            parsed["latency_sec"] = round(time.time() - t0, 3)
            results.append(parsed)
            print(f"[{idx}/{len(images)}] ok {path.name} {parsed['latency_sec']}s")
        except Exception as e:
            results.append(
                {
                    "frame": path.name,
                    "error": str(e),
                    "scene_summary": "",
                    "hud_state": "",
                    "player_state": "",
                    "events": [],
                    "issues": [],
                    "fun_moments": [],
                    "confidence": 0,
                }
            )
            print(f"[{idx}/{len(images)}] fail {path.name} {e}", file=sys.stderr)

    summary = summarize(results)
    output = {
        "model": args.model,
        "frames_analyzed": len(images),
        "summary": summary,
        "frames": results,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {out_path}")


if __name__ == "__main__":
    main()
