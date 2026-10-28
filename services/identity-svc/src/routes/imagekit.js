import crypto from 'node:crypto';

const PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY || '';

export default async function imagekitRoutes(app) {
  app.get('/auth', async () => {
    const token = crypto.randomUUID();
    const expire = Math.floor(Date.now() / 1000) + 1800; // 30 min
    const signature = crypto
      .createHmac('sha1', PRIVATE_KEY)
      .update(token + expire)
      .digest('hex');
    return { token, expire, signature };
  });
}
