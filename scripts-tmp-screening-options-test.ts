import { db } from './src/prisma/db.js';

const BASE = 'http://localhost:3009';
const rand = () => Math.random().toString(36).slice(2, 10);

async function main() {
  const employerEmail = `emp-${rand()}@test.com`;
  const candA = `cand-a-${rand()}@test.com`;
  const candB = `cand-b-${rand()}@test.com`;
  const password = 'Senha123!';

  async function register(email: string, role: string) {
    const extra = role === 'EMPLOYER' ? { nome_fantasia: `Empresa ${rand()}` } : { full_name: `Candidato ${rand()}` };
    const r = await fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role, ...extra }),
    });
    const body = await r.json();
    if (!r.ok) throw new Error(`register ${email} failed: ${JSON.stringify(body)}`);
    return body;
  }

  async function login(email: string) {
    const r = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = await r.json();
    if (!r.ok) throw new Error(`login ${email} failed: ${JSON.stringify(body)}`);
    return body.access_token as string;
  }

  await register(employerEmail, 'EMPLOYER');
  await register(candA, 'JOB_SEEKER');
  await register(candB, 'JOB_SEEKER');

  const employerUser = await db.orm.public.User.where({ email: employerEmail }).first();
  await db.orm.public.CompanyProfile.where({ user_id: employerUser!.id }).update({ verification_status: 'APPROVED' as any });

  const employerToken = await login(employerEmail);
  const candAToken = await login(candA);
  const candBToken = await login(candB);

  // Create job with an eliminatory multi-option question
  const createJobRes = await fetch(`${BASE}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${employerToken}` },
    body: JSON.stringify({
      title: 'Vaga Teste Eliminatória',
      description: 'Descrição de teste para a vaga.',
      address: 'Rua Teste, 1',
      work_schedule: 'Seg a Sex',
      mandatory_qualifications: ['Requisito 1'],
      differential_qualifications: [],
      benefits: [],
      work_model: 'PRESENCIAL',
      contract_type: 'CLT',
      questions: [
        {
          question_text: 'Qual seu nível de inglês?',
          options: [
            { option_text: 'Avançado', eliminates: false },
            { option_text: 'Intermediário', eliminates: false },
            { option_text: 'Nenhum', eliminates: true },
          ],
        },
      ],
    }),
  });
  const job = await createJobRes.json();
  if (!createJobRes.ok) throw new Error(`create job failed: ${JSON.stringify(job)}`);
  console.log('Job created:', job.id);

  // Approve job directly in DB so it's ACTIVE (status starts PENDING)
  await db.orm.public.Job.where({ id: job.id }).update({ status: 'ACTIVE' as any });

  // Public GET /jobs/:id must never leak "eliminates"
  const publicJobRes = await fetch(`${BASE}/jobs/${job.id}`);
  const publicJob = await publicJobRes.json();
  const rawText = JSON.stringify(publicJob);
  if (rawText.includes('eliminates')) {
    throw new Error('LEAK: eliminates field present in public job response: ' + rawText);
  }
  console.log('OK: public job response does not leak "eliminates"');
  const q = publicJob.questions[0];
  const safeOption = q.options.find((o: any) => o.option_text === 'Avançado');
  const knockoutOption = q.options.find((o: any) => o.option_text === 'Nenhum');
  if (!safeOption || !knockoutOption) throw new Error('options missing from public response: ' + JSON.stringify(q));

  // Candidate A picks the eliminating option -> expect auto-rejection
  const applyAres = await fetch(`${BASE}/jobs/${job.id}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${candAToken}` },
    body: JSON.stringify({ answers: [{ question_id: q.id, option_id: knockoutOption.id }] }),
  });
  const appA = await applyAres.json();
  if (!applyAres.ok) throw new Error(`apply A failed: ${JSON.stringify(appA)}`);
  if (appA.status !== 'REJECTED' || appA.is_knocked_out !== true) {
    throw new Error('Candidate A should be auto-rejected: ' + JSON.stringify(appA));
  }
  console.log('OK: candidate A knocked out automatically ->', appA.status, appA.is_knocked_out);

  // Candidate B picks a safe option -> expect normal APPLIED
  const applyBres = await fetch(`${BASE}/jobs/${job.id}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${candBToken}` },
    body: JSON.stringify({ answers: [{ question_id: q.id, option_id: safeOption.id }] }),
  });
  const appB = await applyBres.json();
  if (!applyBres.ok) throw new Error(`apply B failed: ${JSON.stringify(appB)}`);
  if (appB.status !== 'APPLIED' || appB.is_knocked_out !== false) {
    throw new Error('Candidate B should be normally applied: ' + JSON.stringify(appB));
  }
  console.log('OK: candidate B applied normally ->', appB.status, appB.is_knocked_out);

  // Employer fetching own job via GET /jobs/:id should still not see eliminates
  // (existing design: gabarito never returns, even to the owner)
  const ownerJobRes = await fetch(`${BASE}/jobs/${job.id}`, { headers: { Authorization: `Bearer ${employerToken}` } });
  const ownerJob = await ownerJobRes.json();
  if (JSON.stringify(ownerJob).includes('eliminates')) {
    throw new Error('LEAK: eliminates leaked to owning employer via GET /jobs/:id');
  }
  console.log('OK: owner GET /jobs/:id also does not leak eliminates (matches existing design)');

  // Cleanup
  for (const email of [employerEmail, candA, candB]) {
    await db.orm.public.User.where({ email }).delete();
  }
  console.log('Cleanup done. ALL CHECKS PASSED.');
}

main().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
