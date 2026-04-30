#!/usr/bin/env python3
"""
import_claude_ai.py — Import Claude.ai export JSON into Silver Oak OS memory SQLite DB.

Usage:
  python3 import_claude_ai.py <path/to/conversations.json> [--db /path/to/claudeclaw.db] [--chat-id <chat_id>]

Idempotent: skips conversations already imported (source='claude_ai_import' + chat_id + summary)
Embedding: Gemini gemini-embedding-001 via google.generativeai
"""

import argparse
import hashlib
import json
import os
import sqlite3
import sys
import time
import warnings

warnings.filterwarnings("ignore", category=FutureWarning)
import google.generativeai as genai

DEFAULT_DB = "store/claudeclaw.db"
DEFAULT_CHAT_ID = "claude_ai_import"
DEFAULT_AGENT_ID = "main"
EMBEDDING_MODEL = "gemini-embedding-001"
BATCH_SIZE = 20


def parse_args():
    p = argparse.ArgumentParser(description="Import Claude.ai export JSON into Silver Oak OS memory DB")
    p.add_argument("conversations_json", help="Path to conversations.json from Claude.ai export")
    p.add_argument("--db", default=None, help=f"Path to claudeclaw.db (default: auto-discover)")
    p.add_argument("--chat-id", default=DEFAULT_CHAT_ID)
    p.add_argument("--agent-id", default=DEFAULT_AGENT_ID)
    p.add_argument("--dry-run", action="store_true", help="Parse only, do not write")
    p.add_argument("--importance", type=float, default=0.7)
    p.add_argument("--no-embed", action="store_true", help="Skip embedding generation")
    return p.parse_args()


def discover_db():
    candidates = [
        os.path.join(os.getcwd(), DEFAULT_DB),
        "/app/silver-oak-os/store/claudeclaw.db",
        "/app/silver-oak-os/store/main/claudeclaw.db",
    ]
    for path in candidates:
        if os.path.isfile(path):
            return path
    for root, dirs, files in os.walk("/app/silver-oak-os"):
        for f in files:
            if f == "claudeclaw.db" and "store" in root:
                return os.path.join(root, f)
    raise FileNotFoundError("claudeclaw.db not found. Use --db")


def load_export(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, list):
        return data
    elif isinstance(data, dict):
        return data.get("conversations", data.get("accounts", []))
    raise ValueError(f"Unexpected JSON: {type(data)}")


def chunk_message(msg, conv_name):
    role = msg.get("role", "")
    content = msg.get("content", "")
    if isinstance(content, list):
        texts = []
        for block in content:
            if isinstance(block, dict):
                if block.get("type") == "text":
                    texts.append(block.get("text", ""))
                elif block.get("type") == "tool_use":
                    texts.append(f"[Tool: {block.get('name', 'unknown')}]")
            elif isinstance(block, str):
                texts.append(block)
        content = "\n".join(texts)
    elif not isinstance(content, str):
        content = str(content) if content else ""
    text = content.strip()
    return text if len(text) >= 10 else None


def build_summary(text, max_len=200):
    text = text.strip()
    for sep in [". ", "!\n", "?\n", "\n\n"]:
        if sep in text:
            end = text.index(sep) + len(sep.strip())
            s = text[: min(end, max_len)].strip()
            if len(s) > 20:
                return s
    return text[:max_len].strip()


def fingerprint(chat_id, summary):
    return hashlib.sha256(f"{chat_id}|{summary}".encode()).hexdigest()[:16]


def get_existing(db_path, chat_id):
    conn = sqlite3.connect(db_path)
    try:
        rows = conn.execute(
            "SELECT summary FROM memories WHERE source=? AND chat_id=?",
            ("claude_ai_import", chat_id),
        ).fetchall()
        return {fingerprint(chat_id, r[0]) for r in rows}
    except sqlite3.OperationalError:
        return set()
    finally:
        conn.close()


def get_embeddings(texts, api_key):
    genai.configure(api_key=api_key)
    model = f"models/{EMBEDDING_MODEL}"
    all_emb = []
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        try:
            result = genai.embed_content(model=model, content=batch)
            emb = result.get("embedding", [])
            all_emb.extend(emb)
            if i + BATCH_SIZE < len(texts):
                time.sleep(0.5)
        except Exception as e:
            print(f"  Embedding error batch {i//BATCH_SIZE}: {e}")
            all_emb.extend([[]] * len(batch))
    return all_emb


def insert_memory(conn, chat_id, text, summary, importance, agent_id, embedding=None):
    now = int(time.time())
    conn.execute(
        """INSERT INTO memories (chat_id, source, raw_text, summary, entities, topics,
           importance, salience, embedding, embedding_model, agent_id, created_at, accessed_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (chat_id, "claude_ai_import", text, summary,
         json.dumps([]), json.dumps([]), importance, 1.0,
         json.dumps(embedding) if embedding else None,
         EMBEDDING_MODEL if embedding else None,
         agent_id, now, now),
    )


def main():
    args = parse_args()
    db_path = args.db or discover_db()
    print(f"DB: {db_path}")
    print(f"File: {args.conversations_json}")

    conversations = load_export(args.conversations_json)
    print(f"Conversations: {len(conversations)}")

    existing = get_existing(db_path, args.chat_id)
    print(f"Existing imported: {len(existing)}")

    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        for env_path in ["/app/silver-oak-os/.env", ".env"]:
            if os.path.isfile(env_path):
                with open(env_path) as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("GOOGLE_API_KEY="):
                            api_key = line.split("=", 1)[1].strip().strip("'\"")
                            break
                if api_key:
                    break
    if not api_key and not args.no_embed:
        print("GOOGLE_API_KEY not found, disabling embeddings")
        args.no_embed = True

    pending = []
    for conv_idx, conv in enumerate(conversations):
        conv_name = conv.get("name", "") or conv.get("uuid", f"conv_{conv_idx}")
        messages = conv.get("messages", [])
        for msg in messages:
            text = chunk_message(msg, conv_name)
            if text is None:
                continue
            summary = build_summary(text)
            fp = fingerprint(args.chat_id, summary)
            if fp in existing:
                continue
            existing.add(fp)
            pending.append((text, summary))
        if (conv_idx + 1) % 50 == 0:
            print(f"  Progress: {conv_idx+1}/{len(conversations)}...")

    print(f"New: {len(pending)}")
    if not pending:
        print("Nothing to import")
        return

    embeddings = []
    if not args.no_embed and api_key:
        print(f"Embedding {len(pending)} texts...")
        embeddings = get_embeddings([t for t, s in pending], api_key)
        ok = sum(1 for e in embeddings if e)
        print(f"  {ok}/{len(embeddings)} succeeded")
    else:
        embeddings = [None] * len(pending)

    if args.dry_run:
        print(f"DRY RUN — would insert {len(pending)} memories")
        return

    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=OFF")

    inserted = 0
    for i, (text, summary) in enumerate(pending):
        try:
            insert_memory(conn, args.chat_id, text, summary,
                          args.importance, args.agent_id,
                          embeddings[i] if i < len(embeddings) else None)
            inserted += 1
            if inserted % 100 == 0:
                conn.commit()
                print(f"  Committed {inserted}/{len(pending)}...")
        except sqlite3.IntegrityError:
            pass

    conn.commit()
    conn.close()
    print(f"\nDone: {inserted} memories from {len(conversations)} conversations")


if __name__ == "__main__":
    main()
