import { trackAction, getTopTags, decayScores } from '../controllers/recommendation.controller.js';

export default async function (fastify, opts) {
  fastify.post('/track-action', trackAction);
  fastify.get('/:userId/top-tags', getTopTags);
  fastify.post('/decay', decayScores);
}
