import { db, Role, JobStatus } from '../src/prisma/db.ts';
import * as bcrypt from 'bcrypt';

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Safe cleanup (respecting relations: Application -> Job -> Profiles -> User)
  console.log('🧹 Cleaning up old data...');
  const runtime = db.runtime();
  await runtime.execute(db.sql.public.application.delete().build());
  await runtime.execute(db.sql.public.job.delete().build());
  await runtime.execute(db.sql.public.companyProfile.delete().build());
  await runtime.execute(db.sql.public.candidateProfile.delete().build());
  await runtime.execute(db.sql.public.user.delete().build());

  const passwordHash = await bcrypt.hash('Senha123!', 10);

  // 2. Create ADMIN user
  console.log('👑 Creating ADMIN user...');
  await db.orm.public.User.create({
    email: 'admin@empregasaqua.com',
    password_hash: passwordHash,
    role: Role.ADMIN,
  });

  // 3. Create EMPLOYER users
  console.log('🏢 Creating EMPLOYER users and CompanyProfiles...');
  const emp1 = await db.orm.public.User.create({
    email: 'contato@padariasaqua.com',
    password_hash: passwordHash,
    role: Role.EMPLOYER,
  });
  await db.orm.public.CompanyProfile.create({
    user_id: emp1.id,
    nome_fantasia: 'Padaria Saqua',
    cnpj: '11.111.111/0001-11',
    endereco: 'Centro, Saquarema - RJ',
  });

  const emp2 = await db.orm.public.User.create({
    email: 'rh@supermercadolocal.com',
    password_hash: passwordHash,
    role: Role.EMPLOYER,
  });
  await db.orm.public.CompanyProfile.create({
    user_id: emp2.id,
    nome_fantasia: 'Supermercado Local',
    cnpj: '22.222.222/0001-22',
    endereco: 'Bacaxá, Saquarema - RJ',
  });

  // 4. Create Jobs
  console.log('💼 Creating Jobs...');
  await db.orm.public.Job.create({
    employer_id: emp1.id,
    company_name: 'Padaria Saqua',
    title: 'Atendente de Padaria',
    description: 'Vaga para atendimento ao público no balcão.',
    location: 'Centro',
    status: JobStatus.ACTIVE,
  });

  await db.orm.public.Job.create({
    employer_id: emp1.id,
    company_name: 'Padaria Saqua',
    title: 'Padeiro Noturno',
    description: 'Experiência comprovada em produção noturna.',
    location: 'Centro',
    status: JobStatus.PENDING,
  });

  await db.orm.public.Job.create({
    employer_id: emp2.id,
    company_name: 'Supermercado Local',
    title: 'Operador de Caixa',
    description: 'Turno diurno. Oferecemos treinamento.',
    location: 'Bacaxá',
    status: JobStatus.ACTIVE,
  });

  await db.orm.public.Job.create({
    employer_id: emp2.id,
    company_name: 'Supermercado Local',
    title: 'Repositor',
    description: 'Vaga para repositor de mercadorias. Força física exigida.',
    location: 'Bacaxá',
    status: JobStatus.ACTIVE,
  });

  await db.orm.public.Job.create({
    employer_id: emp2.id,
    company_name: 'Supermercado Local',
    title: 'Gerente de Loja',
    description: 'Mínimo 3 anos de experiência em gestão.',
    location: 'Bacaxá',
    status: JobStatus.PENDING,
  });

  console.log('✅ Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.close();
  });
