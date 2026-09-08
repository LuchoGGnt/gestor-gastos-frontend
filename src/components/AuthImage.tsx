import { useEffect, useState } from "react";
import { fetchMediaBlobUrl } from "../api/endpoints";

export default function AuthImage({
  mediaId,
  alt,
  className,
}: {
  mediaId: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!mediaId) {
      setSrc(null);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    fetchMediaBlobUrl(mediaId).then((url) => {
      if (cancelled) {
        URL.revokeObjectURL(url);
        return;
      }
      objectUrl = url;
      setSrc(url);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [mediaId]);

  if (!src) {
    return (
      <div
        className={`neo-pressed flex items-center justify-center text-[var(--text-secondary)] text-xs ${className ?? ""}`}
        aria-label={alt}
      >
        {alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} />;
}
