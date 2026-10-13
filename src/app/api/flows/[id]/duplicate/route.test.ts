import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST } from './route';

const mockFlow = {
  id: 'flow-1',
  account_id: 'acct-1',
  user_id: 'user-1',
  name: 'Lead Bot',
  description: 'Test description',
  trigger_type: 'keyword',
  trigger_config: { keywords: ['hi'] },
  entry_node_id: 'start',
  fallback_policy: {},
  status: 'active',
  execution_count: 5,
};

const mockNodes = [
  {
    flow_id: 'flow-1',
    node_key: 'start',
    node_type: 'start',
    config: { next_node_key: 'msg' },
    position_x: 0,
    position_y: 0,
  },
  {
    flow_id: 'flow-1',
    node_key: 'msg',
    node_type: 'send_message',
    config: { text: 'Hello!' },
    position_x: 100,
    position_y: 100,
  },
];

let roleError: Error | null = null;
let foundFlow: typeof mockFlow | null = mockFlow;
const insertedFlows: Record<string, unknown>[] = [];
const insertedNodes: Record<string, unknown>[] = [];

vi.mock('@/lib/auth/account', () => ({
  requireRole: vi.fn(async () => {
    if (roleError) throw roleError;
    return { accountId: 'acct-1', userId: 'user-1' };
  }),
  toErrorResponse: vi.fn((err: unknown) => {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
}));

vi.mock('@/lib/flows/admin-client', () => ({
  supabaseAdmin: vi.fn(() => ({
    from: (table: string) => {
      if (table === 'flows') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: foundFlow, error: null }),
              }),
            }),
          }),
          insert: (payload: Record<string, unknown>) => {
            insertedFlows.push(payload);
            const copy = { ...payload, id: 'flow-copy-1' };
            return {
              select: () => ({
                single: async () => ({ data: copy, error: null }),
              }),
            };
          },
        };
      }
      if (table === 'flow_nodes') {
        return {
          select: () => ({
            eq: () => ({
              eq: async () => ({ data: mockNodes, error: null }),
              then: (resolve: (v: unknown) => void) => resolve({ data: mockNodes, error: null }),
              data: mockNodes,
              error: null,
            }),
          }),
          insert: async (nodes: Record<string, unknown>[]) => {
            insertedNodes.push(...nodes);
            return { error: null };
          },
        };
      }
      return {};
    },
  })),
}));

describe('POST /api/flows/[id]/duplicate', () => {
  beforeEach(() => {
    roleError = null;
    foundFlow = mockFlow;
    insertedFlows.length = 0;
    insertedNodes.length = 0;
  });

  it('rejects forbidden callers when requireRole throws', async () => {
    roleError = new Error('Forbidden');
    const res = await POST(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'flow-1' }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 404 when original flow is not found', async () => {
    foundFlow = null;
    const res = await POST(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'non-existent' }),
    });
    expect(res.status).toBe(404);
  });

  it('successfully duplicates flow in draft status and copies its nodes', async () => {
    const res = await POST(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'flow-1' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.flow.name).toBe('Lead Bot (Copy)');
    expect(body.flow.status).toBe('draft');
    expect(insertedFlows).toHaveLength(1);
    expect(insertedFlows[0].execution_count).toBe(0);
    expect(insertedNodes).toHaveLength(2);
    expect(insertedNodes[0].flow_id).toBe('flow-copy-1');
  });
});
