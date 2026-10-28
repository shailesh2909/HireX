import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with mock data...');

  // Create mock users
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const user1 = await prisma.user.upsert({
    where: { email: 'ananya@buildloop.com' },
    update: {},
    create: {
      id: crypto.randomUUID(),
      name: 'Ananya Singh',
      firstName: 'Ananya',
      lastName: 'Singh',
      email: 'ananya@buildloop.com',
      passwordHash,
      role: 'individual',
      identityVerified: true,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'contact@nexasystems.com' },
    update: {},
    create: {
      id: crypto.randomUUID(),
      name: 'Nexa Systems',
      email: 'contact@nexasystems.com',
      passwordHash,
      role: 'business',
      companyName: 'Nexa Systems',
      identityVerified: true,
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: 'rahul@productconsult.com' },
    update: {},
    create: {
      id: crypto.randomUUID(),
      name: 'Rahul Mehta',
      firstName: 'Rahul',
      lastName: 'Mehta',
      email: 'rahul@productconsult.com',
      passwordHash,
      role: 'individual',
      identityVerified: true,
    },
  });

  console.log('Users seeded.');

  // Check if posts exist to avoid duplicating seed data
  const postCount = await prisma.post.count();
  if (postCount > 0) {
    console.log('Posts already exist, skipping post seed.');
    return;
  }

  // Create mock posts
  const post1 = await prisma.post.create({
    data: {
      id: crypto.randomUUID(),
      authorId: user1.id,
      content: 'Looking for a verified frontend engineer with React + performance optimization experience.',
      tags: ['Hiring'],
      updatedAt: new Date(),
    },
  });

  const post2 = await prisma.post.create({
    data: {
      id: crypto.randomUUID(),
      authorId: user2.id,
      content: 'Opening integration partnerships with analytics and CRM startups.',
      tags: ['Partnership'],
      updatedAt: new Date(),
    },
  });

  const post3 = await prisma.post.create({
    data: {
      id: crypto.randomUUID(),
      authorId: user3.id,
      content: 'Sharing my framework for reducing onboarding drop-offs by 28%.',
      tags: ['Collab'],
      updatedAt: new Date(),
    },
  });

  // Create mock comments and likes
  await prisma.postComment.create({
    data: {
      id: crypto.randomUUID(),
      postId: post1.id,
      authorId: user3.id,
      content: 'Shared your role with my network.',
    },
  });

  await prisma.like.create({
    data: {
      id: crypto.randomUUID(),
      postId: post3.id,
      userId: user1.id,
    },
  });

  console.log('Posts and engagements seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
