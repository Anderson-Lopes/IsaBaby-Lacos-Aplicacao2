import { supabase } from '@/lib/supabase';

const BUCKET = 'product-images';
const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function uploadProductImage(file: File): Promise<string> {
  if (!supabase) throw new Error('Supabase não está configurado.');
  const extension = IMAGE_EXTENSIONS[file.type];
  if (!extension) throw new Error('Use uma imagem JPG, PNG, WebP, AVIF ou GIF.');
  if (file.size > 5 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 5 MB.');

  const path = `${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(`Não foi possível enviar a imagem: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function deleteProductImage(imageUrl?: string): Promise<void> {
  if (!supabase || !imageUrl) return;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const markerIndex = imageUrl.indexOf(marker);
  if (markerIndex < 0) return;

  const path = decodeURIComponent(imageUrl.slice(markerIndex + marker.length));
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(`Não foi possível excluir a imagem: ${error.message}`);
}
