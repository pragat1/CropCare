import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Props = {
  label?: string;
  hint?: string;
  file: File | null;
  onFile: (f: File | null) => void;
  disabled?: boolean;
  maxMB?: number;
  ariaLabel?: string;
};

export function UploadZone({ label = "Upload image", hint = "JPG or PNG, up to 8MB", file, onFile, disabled, maxMB = 8, ariaLabel }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function pick(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    if (f.size > maxMB * 1024 * 1024) { toast.error(`Image larger than ${maxMB}MB`); return; }
    setPreview(URL.createObjectURL(f));
    onFile(f);
  }
  function clear() {
    setPreview(null);
    onFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label={ariaLabel ?? label}
        aria-disabled={disabled}
        className="rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors bg-muted/40 aspect-video grid place-items-center cursor-pointer overflow-hidden relative"
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !disabled) { e.preventDefault(); inputRef.current?.click(); } }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if (!disabled) pick(e.dataTransfer.files?.[0] ?? null); }}
      >
        {preview ? (
          <>
            <img src={preview} alt="Selected preview" className="w-full h-full object-cover" />
            <Button
              type="button"
              size="icon"
              variant="secondary"
              aria-label="Remove image"
              className="absolute top-2 right-2 min-h-9 min-w-9"
              onClick={(e) => { e.stopPropagation(); clear(); }}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <div className="text-center text-muted-foreground p-6">
            <Upload className="h-6 w-6 mx-auto mb-2" />
            <p className="text-sm">{label}</p>
            <p className="text-xs mt-1">{hint}</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label={ariaLabel ?? label}
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
      </div>
      {file && (
        <p className="text-xs text-muted-foreground mt-2 truncate">{file.name} · {(file.size / 1024).toFixed(0)} KB</p>
      )}
    </div>
  );
}