const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET = 'complaint-photos';

async function uploadComplaintPhoto(file) {
  const extension = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
  }[file.mimetype];

  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filename);

  return data.publicUrl;
}

async function deleteComplaintPhoto(photoUrl) {
  if (!photoUrl) return;

  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = photoUrl.indexOf(marker);

  if (index === -1) return;

  const filename = decodeURIComponent(
    photoUrl.substring(index + marker.length)
  );

  await supabase.storage
    .from(BUCKET)
    .remove([filename]);
}

module.exports = {
  uploadComplaintPhoto,
  deleteComplaintPhoto,
};