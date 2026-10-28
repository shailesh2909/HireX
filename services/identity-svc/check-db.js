import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  try {
    const postCount = await prisma.post.count();
    console.log('Post count:', postCount);
    const userCount = await prisma.user.count();
    console.log('User count:', userCount);
  } catch (err) {
    console.error('Check failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
