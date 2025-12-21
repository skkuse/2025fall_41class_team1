#!/usr/bin/env bash
set -e

# 🔹 이 스크립트가 위치한 디렉토리 (== src/rag)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 🔹 프로젝트 루트 (src/rag 기준 두 단계 위)
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 🔹 RAG 디렉토리 & venv 디렉토리
RAG_DIR="$SCRIPT_DIR"                    # == src/rag
VENV_DIR="$PROJECT_ROOT/.rag-venv"       # 프로젝트 루트에 만든 venv

echo "SCRIPT_DIR    = $SCRIPT_DIR"
echo "PROJECT_ROOT  = $PROJECT_ROOT"
echo "RAG_DIR       = $RAG_DIR"
echo "VENV_DIR      = $VENV_DIR"

# 1) 가상환경 활성화 (있으면)
if [ -d "$VENV_DIR" ]; then
  source "$VENV_DIR/bin/activate"
else
  echo "⚠️  .rag-venv 가 없어요. 시스템 python으로 실행합니다."
fi

# 2) 작업 디렉토리를 src/rag로 고정
cd "$RAG_DIR"

# 3) 로그 폴더는 프로젝트 루트 기준
mkdir -p "$PROJECT_ROOT/logs"

# 4) ingest 실행 (chroma_db는 src/rag 안에 생성됨)
python ingest.py >> "$PROJECT_ROOT/logs/ingest.log" 2>&1
