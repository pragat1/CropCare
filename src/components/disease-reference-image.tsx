import { useState } from "react";
import { ImageOff } from "lucide-react";

/** Only an image explicitly attached to a disease record is eligible here. */
export function diseaseImageUrl(data: Record<string, unknown>): string | null {
  const value = data.image_url;
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function DiseaseReferenceImage({
  src,
  name,
  crop,
  priority = false,
}: {
  src: string | null;
  name: string;
  crop?: string;
  priority?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const visible = src && src !== failedUrl;

  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-lg bg-field-soft">
      {visible ? (
        <img
          src={src}
          alt={`${name} symptoms${crop ? ` on ${crop}` : ""}`}
          width={960}
          height={600}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailedUrl(src)}
          className="h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.025]"
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-5 text-center text-field-muted">
          <ImageOff aria-hidden className="h-9 w-9 opacity-60" strokeWidth={1.5} />
          <span className="text-sm font-medium">Reference image unavailable</span>
        </div>
      )}
    </div>
  );
}