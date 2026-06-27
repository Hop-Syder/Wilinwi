'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Gestion des photos d'un produit (feature Business+).
 *   Upload direct vers Supabase Storage (bucket `product-photos`, 2 Mo max,
 *   chemin tenant-scopé), galerie avec suppression. Le gating par plan est géré
 *   par le parent (affiché seulement si le plan autorise les images).
 */

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';

const BUCKET = 'product-photos';
const MAX_BYTES = 2 * 1024 * 1024; // 2 Mo
const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

interface Props {
  tenantId: string;
  photos: string[];
  onChange: (photos: string[]) => void;
  max: number;
}

/** Extrait le chemin objet depuis l'URL publique Supabase (pour la suppression). */
function pathFromPublicUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

export function ProductPhotos({ tenantId, photos, onChange, max }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAdd = photos.length < max && !busy;

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const slots = max - photos.length;
    const toUpload = Array.from(files).slice(0, Math.max(0, slots));
    if (toUpload.length === 0) return;

    setBusy(true);
    const supabase = getSupabase();
    const added: string[] = [];
    try {
      for (const file of toUpload) {
        if (!ACCEPTED.includes(file.type)) {
          setError('Format non supporté (JPEG, PNG ou WebP).');
          continue;
        }
        if (file.size > MAX_BYTES) {
          setError(`« ${file.name} » dépasse 2 Mo.`);
          continue;
        }
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${tenantId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) {
          setError(`Échec de l'envoi : ${upErr.message}`);
          continue;
        }
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        added.push(data.publicUrl);
      }
      if (added.length > 0) onChange([...photos, ...added]);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function remove(url: string) {
    onChange(photos.filter((p) => p !== url));
    // Suppression best-effort du fichier dans le Storage (n'échoue pas l'UI).
    const path = pathFromPublicUrl(url);
    if (path) {
      void getSupabase().storage.from(BUCKET).remove([path]);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {photos.map((url) => (
          <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200">
            <Image src={url} alt="Photo produit" fill sizes="80px" className="object-cover" unoptimized />
            <button
              type="button"
              onClick={() => void remove(url)}
              className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-white hover:bg-danger"
              aria-label="Supprimer la photo"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 transition-colors hover:border-brand hover:text-brand"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            <span className="text-[10px] font-medium">{busy ? 'Envoi…' : 'Ajouter'}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        multiple
        className="hidden"
        onChange={(e) => void onFiles(e.target.files)}
      />

      <p className="mt-1.5 text-[11px] text-slate-400">
        JPEG, PNG ou WebP · 2 Mo max · {photos.length}/{max} photo{max > 1 ? 's' : ''}
      </p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
