import { useState } from "react";
import { ImageOff } from "lucide-react";

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
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-lg bg-secondary">
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
        <div className="flex h-full flex-col items-center justify-center gap-2 px-5 text-center text-muted-foreground">
          <ImageOff aria-hidden className="h-9 w-9 opacity-60" strokeWidth={1.5} />
          <span className="text-sm font-medium">No reference photo yet</span>
          <span className="text-xs">Symptoms are described in full on the detail page.</span>
        </div>
      )}
    </div>
  );
}
