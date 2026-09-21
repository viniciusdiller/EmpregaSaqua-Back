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
    title: 'Atendente de Padaria',
    description: 'Vaga para atendimento ao público no balcão.',
    address: 'Centro, Saquarema',
    work_schedule: 'Escala 6x1',
    salary_range: 'R$ 1.500,00',
    mandatory_qualifications: ['Ensino Médio Completo'],
    differential_qualifications: ['Experiência anterior'],
    benefits: ['Vale Transporte', 'Lanche no local'],
    status: JobStatus.ACTIVE,
  });

  await db.orm.public.Job.create({
    employer_id: emp1.id,
    title: 'Padeiro Noturno',
    description: 'Experiência comprovada em produção noturna.',
    address: 'Centro, Saquarema',
    work_schedule: 'Noturno, Escala 5x2',
    salary_range: 'R$ 3.000,00',
    mandatory_qualifications: ['Experiência de 2 anos na área'],
    differential_qualifications: [],
    benefits: ['Adicional Noturno', 'Vale Transporte'],
    status: JobStatus.PENDING,
  });

  await db.orm.public.Job.create({
    employer_id: emp2.id,
    title: 'Operador de Caixa',
    description: 'Turno diurno. Oferecemos treinamento.',
    address: 'Bacaxá',
    work_schedule: 'Segunda a Sábado - 08h às 17h',
    salary_range: 'R$ 1.600,00',
    mandatory_qualifications: ['Ensino Médio Completo'],
    differential_qualifications: ['Experiência em supermercado'],
    benefits: ['Vale Alimentação', 'Vale Transporte'],
    status: JobStatus.ACTIVE,
  });

  await db.orm.public.Job.create({
    employer_id: emp2.id,
    title: 'Repositor',
    description: 'Vaga para repositor de mercadorias. Força física exigida.',
    address: 'Bacaxá',
    work_schedule: 'Escala 6x1',
    salary_range: 'R$ 1.500,00',
    mandatory_qualifications: ['Disposição Física'],
    differential_qualifications: [],
    benefits: ['Vale Transporte', 'Refeição no local'],
    status: JobStatus.ACTIVE,
  });

  await db.orm.public.Job.create({
    employer_id: emp2.id,
    title: 'Gerente de Loja',
    description: 'Mínimo 3 anos de experiência em gestão.',
    address: 'Bacaxá',
    work_schedule: 'Comercial',
    salary_range: 'R$ 4.500,00',
    mandatory_qualifications: ['Superior em Administração ou áreas correlatas', 'Experiência de 3 anos'],
    differential_qualifications: ['Pós-graduação', 'Cursos de Liderança'],
    benefits: ['Vale Alimentação', 'Vale Combustível', 'Plano de Saúde'],
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
