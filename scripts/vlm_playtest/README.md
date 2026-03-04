# VLM Playtest Analyzer

## 前提
- `ffmpeg`
- `ollama serve` が起動中
- visionモデル（推奨: `qwen3-vl:4b`）

## 使い方
```bash
scripts/vlm_playtest/run_playtest_analysis.sh /path/to/playtest.mp4 qwen3-vl:4b
```

出力:
- `playtest_vlm/<timestamp>/frames/`
- `playtest_vlm/<timestamp>/analysis.json`

## 単体実行
```bash
scripts/vlm_playtest/extract_frames.sh /path/to/playtest.mp4 /tmp/frames 2
python3 scripts/vlm_playtest/analyze_frames.py \
  --frames /tmp/frames \
  --out /tmp/analysis.json \
  --model qwen3-vl:4b
```

## 画面録画もまとめて実行
```bash
# 90秒録画して、そのまま解析
scripts/vlm_playtest/capture_and_analyze.sh 90 "Roblox|Studio|wine" qwen3-vl:4b
```

録画のみ:
```bash
scripts/vlm_playtest/capture_desktop.sh /tmp/playtest.mp4 60 "Roblox|Studio|wine"
```

Robloxウィンドウが開くまで待ってから録画したい場合:
```bash
WAIT_FOR_WINDOW=1 WAIT_TIMEOUT=180 \
scripts/vlm_playtest/capture_desktop.sh /tmp/playtest.mp4 90 "RobloxStudioBeta|Roblox"
```
