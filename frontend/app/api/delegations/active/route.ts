import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';

const DelegationSchema = z.object({
  id: z.string(),
  from_agent: z.string(),
  to_agent: z.string(),
  prompt: z.string().nullable(),
  status: z.string(),
  created_at: z.string(),
});

type DelegationRow = {
  id: string;
  from_agent: string;
  to_agent: string;
  prompt: string | null;
  status: string;
  created_at: string;
};

const ResponseSchema = z.object({
  delegations: z.array(DelegationSchema),
  count: z.number(),
});

// DB at project root; Next.js CWD = /app/silver-oak-os/frontend
const DB_PATH = path.resolve(process.cwd(), '..', 'store', 'main', 'claudeclaw.db');

export async function GET() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return NextResponse.json(
        { delegations: [], count: 0, _info: 'DB not initialized yet' },
        { headers: { 'Cache-Control': 'max-age=2' } }
      );
    }

    const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });

    // Check table exists before querying
    const tableCheck = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='inter_agent_tasks'")
      .get() as { name: string } | undefined;

    if (!tableCheck) {
      db.close();
      return NextResponse.json(
        { delegations: [], count: 0, _info: 'Table not created yet' },
        { headers: { 'Cache-Control': 'max-age=2' } }
      );
    }

    const SQL = [
      'SELECT id, from_agent, to_agent, prompt, status, created_at',
      'FROM inter_agent_tasks',
      "WHERE status IN ('pending', 'running')",
      'ORDER BY created_at DESC',
      'LIMIT 50',
    ].join(' ');

    const rows = db.prepare(SQL).all() as DelegationRow[];
    db.close();

    const validated = ResponseSchema.parse({
      delegations: rows,
      count: rows.length,
    });

    return NextResponse.json(validated, {
      headers: { 'Cache-Control': 'max-age=2' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch delegations', message: msg },
      { status: 500 }
    );
  }
}
