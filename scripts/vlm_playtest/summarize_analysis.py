#!/usr/bin/env python3
import argparse
import json
from pathlib import Path


def top_list(items, n=8):
    if not items:
        return []
    return items[:n]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("analysis_json", help="Path to analysis.json")
    args = ap.parse_args()

    path = Path(args.analysis_json)
    data = json.loads(path.read_text(encoding="utf-8"))

    summary = data.get("summary", {})
    print(f"Model: {data.get('model', '-')}")
    print(f"Frames analyzed: {data.get('frames_analyzed', 0)}")
    print("\nTop issues:")
    for row in top_list(summary.get("top_issues", [])):
        print(f"- {row['text']} ({row['count']})")

    print("\nTop events:")
    for row in top_list(summary.get("top_events", [])):
        print(f"- {row['text']} ({row['count']})")

    print("\nTop fun moments:")
    for row in top_list(summary.get("top_fun_moments", [])):
        print(f"- {row['text']} ({row['count']})")


if __name__ == "__main__":
    main()
