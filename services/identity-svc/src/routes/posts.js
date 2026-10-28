import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getBearerToken(authorizationHeader) {
  if (!authorizationHeader || typeof authorizationHeader !== 'string') {
    return null;
  }
  if (!authorizationHeader.startsWith('Bearer ')) {
    return null;
  }
  return authorizationHeader.slice(7).trim();
}

function requireAuthenticatedUserId(request, reply) {
  const authHeader = request.headers.authorization;
  const token = getBearerToken(authHeader);
  if (!token) {
    request.log.error('Missing or invalid authorization header');
    reply.code(401).send({ error: 'Missing or invalid authorization header' });
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const tokenUserId = decoded?.id;

    if (!tokenUserId) {
      request.log.error('Invalid token payload: no user id');
      reply.code(401).send({ error: 'Invalid token payload' });
      return null;
    }

    return tokenUserId;
  } catch (err) {
    request.log.error(`JWT Verification failed: ${err.message}`);
    reply.code(401).send({ error: 'Invalid or expired token' });
    return null;
  }
}

export default async function postsRoutes(fastify) {
  // GET /api/posts - Fetch all posts
  fastify.get('', async (request, reply) => {
    const userId = requireAuthenticatedUserId(request, reply);
    if (!userId) return;

    try {
      const posts = await prisma.post.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          Like: true,
          PostComment: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      // We need author details for posts and comments. Since authorId is in the Post model,
      // we'll fetch all unique authors and attach their names.
      const authorIds = new Set();
      posts.forEach(p => {
        authorIds.add(p.authorId);
        p.PostComment.forEach(c => authorIds.add(c.authorId));
      });

      const users = await prisma.user.findMany({
        where: { id: { in: Array.from(authorIds) } },
        select: { id: true, name: true, role: true, companyName: true },
      });
      const userMap = users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {});

      const formattedPosts = posts.map(p => {
        const authorUser = userMap[p.authorId];
        const authorName = authorUser?.name || 'Verified User';
        const authorRole = authorUser?.role === 'business' 
          ? (authorUser?.companyName || 'Verified Business')
          : 'Verified Professional';

        return {
          id: p.id,
          authorId: p.authorId,
          author: authorName,
          authorRole: authorRole,
          content: p.content,
          tag: p.tags?.[0] || 'Update',
          attachments: p.attachments,
          imagesCount: p.imagesCount,
          createdAt: p.createdAt,
          likes: p.Like.length,
          likedByMe: p.Like.some(l => l.userId === userId),
          comments: p.PostComment.map(c => ({
            id: c.id,
            author: userMap[c.authorId]?.name || 'Verified User',
            text: c.content,
            createdAt: c.createdAt,
          })),
        };
      });

      return reply.send(formattedPosts);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch posts' });
    }
  });

  // POST /api/posts - Create a new post
  fastify.post('', async (request, reply) => {
    const userId = requireAuthenticatedUserId(request, reply);
    if (!userId) return;

    const { content, tag, attachments, imagesCount } = request.body || {};
    request.log.info({ userId, content, tag, attachments, imagesCount }, 'Incoming post request');

    if (!content) {
      return reply.code(400).send({ error: 'Content is required' });
    }

    try {
      const post = await prisma.post.create({
        data: {
          id: crypto.randomUUID(),
          authorId: userId,
          content,
          tags: tag ? [tag] : ['Update'],
          attachments: Array.isArray(attachments) ? attachments : [],
          imagesCount: Number(imagesCount) || 0,
          updatedAt: new Date(),
        },
      });

      request.log.info({ postId: post.id }, 'Post created in DB');

      const user = await prisma.user.findUnique({ where: { id: userId } });

      return reply.send({
        id: post.id,
        author: user?.name || 'Verified User',
        authorRole: user?.role === 'business' ? (user?.companyName || 'Verified Business') : 'Verified Professional',
        content: post.content,
        tag: post.tags[0],
        createdAt: post.createdAt,
        attachments: post.attachments,
        imagesCount: post.imagesCount,
        likes: 0,
        likedByMe: false,
        comments: [],
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to create post' });
    }
  });

  // POST /api/posts/:id/like - Toggle like on a post
  fastify.post('/:id/like', async (request, reply) => {
    const userId = requireAuthenticatedUserId(request, reply);
    if (!userId) return;

    const postId = request.params.id;

    try {
      const existingLike = await prisma.like.findUnique({
        where: { postId_userId: { postId, userId } },
      });

      if (existingLike) {
        await prisma.like.delete({
          where: { postId_userId: { postId, userId } },
        });
      } else {
        await prisma.like.create({
          data: {
            id: crypto.randomUUID(),
            postId,
            userId,
          },
        });
      }

      return reply.send({ success: true, liked: !existingLike });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to toggle like' });
    }
  });

  // POST /api/posts/:id/comment - Add a comment
  fastify.post('/:id/comment', async (request, reply) => {
    const userId = requireAuthenticatedUserId(request, reply);
    if (!userId) return;

    const postId = request.params.id;
    const { text } = request.body || {};

    if (!text) {
      return reply.code(400).send({ error: 'Comment text is required' });
    }

    try {
      const comment = await prisma.postComment.create({
        data: {
          id: crypto.randomUUID(),
          postId,
          authorId: userId,
          content: text,
        },
      });

      const user = await prisma.user.findUnique({ where: { id: userId } });

      return reply.send({
        id: comment.id,
        author: user?.name || 'Verified User',
        text: comment.content,
        createdAt: comment.createdAt,
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to add comment' });
    }
  });
}
