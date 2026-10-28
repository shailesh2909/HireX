const PUBLIC_KEY = 'public_LqnQgtTHhTdTq2O209rxcfAtwzI=';

/**
 * Upload a file to ImageKit via their Upload API.
 * Auth params come from our backend /api/imagekit/auth.
 * No SDK needed — plain fetch.
 */
export async function uploadFile(file, fileName, tags = []) {
  // 1. Get auth params from our backend
  const authRes = await fetch('/api/imagekit/auth');
  if (!authRes.ok) throw new Error('Failed to get ImageKit auth');
  const { token, expire, signature } = await authRes.json();

  // 2. Upload to ImageKit
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileName', fileName || file.name);
  formData.append('publicKey', PUBLIC_KEY);
  formData.append('signature', signature);
  formData.append('expire', expire);
  formData.append('token', token);
  if (tags.length) formData.append('tags', tags.join(','));

  const uploadRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    body: formData,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    console.error('ImageKit upload error:', err);
    throw new Error('Upload failed');
  }

  return uploadRes.json(); // { url, fileId, name, ... }
}
