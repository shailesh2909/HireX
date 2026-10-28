const ACTION_WEIGHTS = {
  view: 1,
  like: 5,
  comment: 10
};

export const trackAction = async (request, reply) => {
  const { userId, tags, actionType } = request.body;
  const weight = ACTION_WEIGHTS[actionType] || 0;
  
  if (weight === 0 || !tags || !tags.length) {
    return reply.status(400).send({ error: 'Invalid payload' });
  }

  const redis = request.server.redis;
  const key = `user:${userId}:affinity`;

  const pipeline = redis.pipeline();
  for (const tag of tags) {
    pipeline.zincrby(key, weight, tag);
  }
  await pipeline.exec();

  return reply.send({ success: true });
};

export const getTopTags = async (request, reply) => {
  const { userId } = request.params;
  const redis = request.server.redis;
  const key = `user:${userId}:affinity`;

  const tags = await redis.zrevrange(key, 0, 2);
  
  return reply.send({ tags });
};

export const decayScores = async (request, reply) => {
  const redis = request.server.redis;
  let cursor = '0';
  
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'user:*:affinity', 'COUNT', 100);
    cursor = nextCursor;
    
    if (keys.length > 0) {
      for (const key of keys) {
        const membersWithScores = await redis.zrange(key, 0, -1, 'WITHSCORES');
        const pipeline = redis.pipeline();
        
        for (let i = 0; i < membersWithScores.length; i += 2) {
          const member = membersWithScores[i];
          const score = parseFloat(membersWithScores[i + 1]);
          const newScore = score * 0.9;
          pipeline.zadd(key, newScore, member);
        }
        await pipeline.exec();
      }
    }
  } while (cursor !== '0');

  return reply.send({ success: true });
};
