import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as crypto from 'node:crypto';
import ts from 'typescript';
import * as validation from '../validation.ts';

function load(file, mocks, extras = {}) {
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  runInNewContext(code, { exports, require: (name) => {
    if (name === 'server-only') return {};
    assert.ok(name in mocks, `Unexpected dependency: ${name}`);
    return mocks[name];
  }, URL, URLSearchParams, AbortSignal, Response, Uint8Array, Buffer, process: { env: {} }, ...extras });
  return exports;
}
const sha = 'a'.repeat(40);
const assessment = { score: 80, coverage: 'supported', summary: 'Claim matches the supplied code change.', claims: [{ claim: 'Added validation', assessment: 'supported', commitShas: [sha], evidence: 'Validation added to the submit handler.' }], limitations: ['Hours worked cannot be inferred from commits.'] };
const input = { workDate: '2026-09-21', summary: 'Added validation', accomplishments: 'Added required input validation', githubRepoUrl: 'https://github.com/team/app', githubUsername: 'alice', githubBranch: 'feature/dsr' };
const evidence = { repository: input.githubRepoUrl, author: 'alice', branch: 'feature/dsr', workDate: input.workDate, commits: [{ sha, url: `${input.githubRepoUrl}/commit/${sha}`, message: 'Add validation', committedAt: '2026-09-21T10:00:00Z', files: [{ filename: 'src/form.ts', additions: 4, deletions: 1, patch: '+ required: true' }] }], warnings: [], limited: false };

test('repository parser rejects non-GitHub targets, redirects and credential URLs', () => {
  for (const url of ['http://github.com/team/app', 'https://github.com.evil.test/team/app', 'https://user:pass@github.com/team/app', 'https://github.com/team/app?token=x', 'https://github.com/team/app#hash', 'https://github.com/team/app/tree/main', 'https://127.0.0.1/team/app', 'https://github.com:8443/team/app']) assert.equal(validation.parseGithubRepository(url), null);
  assert.equal(validation.parseGithubRepository('https://github.com/team/app.git').url, input.githubRepoUrl);
  assert.equal(validation.validGithubUsername('alice'), true);
  assert.equal(validation.validGithubUsername('alice--admin'), false);
  assert.equal(validation.validGithubBranch('../main'), false);
});
test('IST date window correctly crosses UTC dates and rejects impossible dates', () => {
  assert.equal(validation.workDateWindow('2026-09-21').start, '2026-09-20T18:30:00.000Z');
  assert.equal(validation.workDateWindow('2026-09-21').end, '2026-09-21T18:30:00.000Z');
  assert.throws(() => validation.workDateWindow('2026-02-30'));
});
test('assessment validation rejects invented citations, unsupported scores and unsupported claims', () => {
  assert.equal(validation.validateAssessment(assessment, 'groq', 'model', [sha]).score, 80);
  assert.throws(() => validation.validateAssessment({ ...assessment, score: 101 }, 'groq', 'model', [sha]));
  assert.throws(() => validation.validateAssessment(assessment, 'groq', 'model', []));
  assert.throws(() => validation.validateAssessment({ ...assessment, claims: [{ ...assessment.claims[0], commitShas: [] }] }, 'groq', 'model', [sha]));
  assert.equal(validation.validateAssessment({ ...assessment, coverage: 'insufficient_evidence' }, 'groq', 'model', [sha]).score, null);
});
function githubModule(fetchJson, env = { DSR_GITHUB_ALLOWED_REPOS: 'team/app', GITHUB_TOKEN: 'test-token' }) {
  return load('src/features/dsr-review/server/github.ts', { '../validation': validation, './http': { fetchJson } }, { process: { env } });
}
test('GitHub matching filters author and exact IST work date and only uses fixed API hosts', async () => {
  const calls = [];
  const row = { sha, author: { login: 'alice' }, commit: { message: 'Added validation', committer: { date: '2026-09-21T10:00:00Z' } } };
  const client = githubModule(async (url, options) => {
    calls.push(url);
    assert.equal(new URL(url).hostname, 'api.github.com');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    if (url.includes('/commits?')) return [row, { ...row, sha: 'b'.repeat(40), author: { login: 'bob' } }, { ...row, sha: 'c'.repeat(40), commit: { ...row.commit, committer: { date: '2026-09-21T18:30:00Z' } } }];
    if (url.includes('/commits/')) return { ...row, files: evidence.commits[0].files };
    return { default_branch: 'main' };
  });
  const result = await client.collectGithubEvidence(input.githubRepoUrl, 'alice', '', input.workDate);
  assert.equal(result.commits.length, 1);
  assert.equal(result.branch, 'main');
  const query = new URL(calls[1]).searchParams;
  assert.equal(query.get('author'), 'alice');
  assert.equal(query.get('since'), '2026-09-20T18:30:00.000Z');
});
test('non-approved repositories never use the GitHub token', async () => {
  let called = false;
  const client = githubModule(async () => { called = true; });
  await assert.rejects(client.collectGithubEvidence('https://github.com/other/private', 'alice', '', input.workDate), /not enabled/);
  assert.equal(called, false);
});
test('sensitive/generated files and truncated diffs mark evidence incomplete', async () => {
  const row = { sha, author: { login: 'alice' }, commit: { message: 'Update', committer: { date: '2026-09-21T10:00:00Z' } } };
  const client = githubModule(async (url) => url.includes('/commits?') ? [row] : url.includes('/commits/') ? { ...row, files: [{ filename: '.env', patch: 'SECRET=test', additions: 1, deletions: 0 }, { filename: 'src/large.ts', patch: 'x'.repeat(6000), additions: 10, deletions: 0 }] } : { default_branch: 'main' });
  const result = await client.collectGithubEvidence(input.githubRepoUrl, 'alice', '', input.workDate);
  assert.equal(result.limited, true);
  assert.equal(result.commits[0].files.length, 1);
  assert.equal(result.commits[0].files[0].patch.length, 4000);
});
function providers(fetchJson) {
  return load('src/features/dsr-review/server/providers.ts', { '../validation': validation, './http': { fetchJson }, '@/features/ai-settings/server/config': { getAiRuntimeConfig: async () => ({ groq: { key: 'groq-test', model: 'groq-test-model' }, openai: { key: 'openai-test', model: 'openai-test-model' } }) } }, { process: { env: { OPENAI_API_KEY: 'openai-test', GROQ_API_KEY: 'groq-test' } } });
}
test('both providers use structured output; OpenAI storage disabled; limited evidence has no score', async () => {
  const client = providers(async (url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.tools, undefined);
    if (url.includes('api.openai.com')) {
      assert.equal(body.store, false);
      assert.equal(body.text.format.strict, true);
      return { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(assessment) }] }] };
    }
    assert.equal(body.response_format.json_schema.strict, true);
    return { choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(assessment) } }] };
  });
  assert.equal((await client.assessWithProvider('openai', input, evidence)).score, 80);
  assert.equal((await client.assessWithProvider('groq', input, { ...evidence, limited: true })).score, null);
});
test('incomplete model output is rejected rather than displaying a fabricated score', async () => {
  const client = providers(async () => ({ status: 'incomplete', output: [] }));
  await assert.rejects(client.assessWithProvider('openai', input, evidence), /complete assessment/);
});
function reviewService({ stored = null, commits = [], changed = false, locked = true, outcomes } = {}) {
  const saved = [];
  let reads = 0;
  let providerCalls = 0;
  const dsr = { ...input, reviewRevision: 'revision-1' };
  const service = load('src/features/dsr-review/server/review.ts', {
    'node:crypto': crypto,
    '@/database/mongodb/connect': { default: async () => {} },
    '@/database/mongodb/models/daily-update': { DailyUpdateModel: { findById: () => ({ lean: async () => { reads++; return changed && reads > 1 ? { ...dsr, reviewRevision: 'revision-2' } : dsr; } }) } },
    '@/database/mongodb/models/operations/dsr-ai-review': { DsrAiReviewModel: { findById: () => ({ lean: async () => stored }), updateOne: async (...args) => { saved.push(args); return { matchedCount: 1 }; }, findOneAndUpdate: () => ({ lean: async () => locked ? {} : null }) } },
    './github': { collectGithubEvidence: async () => ({ ...evidence, commits }) },
    './providers': { reviewConfiguration: () => ({ missing: [] }), assessWithProvider: async (provider) => { providerCalls++; if (outcomes?.[provider] === 'fail') throw new Error('Provider failure'); return { ...assessment, provider, model: 'test' }; } },
    '@/features/ai-settings/server/config': { getAiRuntimeConfig: async () => ({ openai: { key: '', model: 'openai-test' }, groq: { key: 'groq-test', model: 'groq-test' } }) },
  });
  return { ...service, saved, dsr, providerCalls: () => providerCalls };
}
const admin = { user: { role: 'MANAGER', id: 'admin', fullName: 'Admin' } };
const dsrId = '1234567890abcdef12345678';
test('no commits produces inconclusive result, no model calls and no zero score', async () => {
  const service = reviewService();
  const result = await service.runDsrReview(admin, dsrId, false);
  assert.equal(result.status, 'inconclusive');
  assert.equal(result.assessments.length, 0);
  assert.equal(service.providerCalls(), 0);
});
test('DSR edit invalidates the review hash and stale completion cannot be stored', async () => {
  const service = reviewService({ changed: true });
  assert.notEqual(service.sourceHash(service.dsr), service.sourceHash({ ...service.dsr, reviewRevision: 'new' }));
  await assert.rejects(service.runDsrReview(admin, dsrId, false), /changed during review/);
  assert.equal(service.saved.some(([, update]) => update.$set?.status === 'ready'), false);
});
test('busy review locks prevent duplicate provider requests', async () => {
  const service = reviewService({ locked: false });
  await assert.rejects(service.runDsrReview(admin, dsrId, false), /already running/);
  assert.equal(service.providerCalls(), 0);
});
test('a Groq-only review does not invent a score when Groq fails', async () => {
  const service = reviewService({ commits: evidence.commits, outcomes: { groq: 'fail' } });
  await assert.rejects(service.runDsrReview(admin, dsrId, false), /Groq did not return a valid assessment/);
  assert.equal(service.providerCalls(), 1);
});
test('stored review from an older DSR revision is not shown', async () => {
  const service = reviewService({ stored: { sourceHash: 'old-hash', status: 'ready', result: { score: 100 } } });
  assert.equal((await service.getDsrReview(admin, dsrId)).result, null);
});
function route(role) {
  let calls = 0;
  class ReviewError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
  const handler = load('src/app/api/dsr/[dsrId]/review/route.ts', {
    '@/features/auth/lib/auth-session': { getCurrentSession: async () => role ? { user: { role } } : null },
    '@/features/dsr-review/server/review': { ReviewError, getDsrReview: async () => ({ result: null }), runDsrReview: async () => { calls++; return { status: 'complete' }; } },
  });
  return { ...handler, calls: () => calls };
}
test('API rejects employees, unauthenticated access, missing author confirmation and cross-origin POSTs', async () => {
  const context = { params: Promise.resolve({ dsrId }) };
  for (const [role, status] of [[null, 401], ['EMPLOYEE', 403]]) {
    assert.equal((await route(role).GET(new Request('http://localhost/api'), context)).status, status);
  }
  const api = route('MANAGER');
  const request = (body, origin = 'http://localhost') => new Request('http://localhost/api', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await api.POST(request({}), context)).status, 400);
  assert.equal((await api.POST(request({ confirmAuthor: true }, 'https://evil.test'), context)).status, 403);
  assert.equal(api.calls(), 0);
  assert.equal((await api.POST(request({ confirmAuthor: true }), context)).status, 200);
  assert.equal(api.calls(), 1);
});


test('positive scores without any supported claim are rejected', () => {
  assert.throws(() => validation.validateAssessment({ ...assessment, claims: [] }, 'openai', 'model', [sha]), /supporting commit/);
});
test('HTTP layer rejects redirects, rate limits and oversized responses', async () => {
  const client = load('src/features/dsr-review/server/http.ts', {}, { fetch: async (_url, options) => {
    assert.equal(options.redirect, 'error');
    assert.equal(options.cache, 'no-store');
    return new Response(JSON.stringify({ text: 'x'.repeat(100) }));
  } });
  await assert.rejects(client.fetchJson('https://api.github.com/test', {}, 10), /exceeds review limits/);
  const limited = load('src/features/dsr-review/server/http.ts', {}, { fetch: async () => new Response('', { status: 429 }) });
  await assert.rejects(limited.fetchJson('https://api.github.com/test', {}), /rate limit/);
});
