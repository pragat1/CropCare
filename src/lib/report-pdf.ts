/**
 * Client-side PDF report generation.
 * Runs in the browser (jsPDF is lazy-imported) because the edge runtime
 * cannot host headless renderers, and the signed image URL is already
 * available to the signed-in user.
 */
import type { WeatherSnapshot } from "./weather-types";

export type ReportInput = {
  crop: string;
  isHealthy: boolean;
  disease: string | null;
  confidence: number | null;
  severity: string | null;
  plantPart?: string | null;
  summary?: string | null;
  symptoms: string[];
  causes: string[];
  organic: string[];
  chemical: string[];
  prevention: string[];
  weather?: WeatherSnapshot | null;
  createdAt: string;
  imageUrl?: string | null;
  location?: string | null;
};

async function loadImage(url: string): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(blob);
    });
    const size = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 4, h: 3 });
      img.src = dataUrl;
    });
    return { dataUrl, ...size };
  } catch {
    return null;
  }
}

export async function generateDetectionPdf(input: ReportInput) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = M;

  const ensure = (needed: number) => {
    if (y + needed > pageH - M) {
      doc.addPage();
      y = M;
    }
  };

  // Header band
  doc.setFillColor(21, 88, 56);
  doc.rect(0, 0, pageW, 78, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(19);
  doc.text("CropCare — Crop Diagnosis Report", M, 36);
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(
    `${input.crop} · Generated ${new Date().toLocaleString()}`,
    M,
    54,
  );
  y = 110;
  doc.setTextColor(20, 20, 20);

  const heading = (text: string) => {
    ensure(34);
    doc.setFont("helvetica", "bold").setFontSize(12);
    doc.setTextColor(21, 88, 56);
    doc.text(text, M, y);
    doc.setTextColor(20, 20, 20);
    y += 16;
  };

  const body = (text: string) => {
    doc.setFont("helvetica", "normal").setFontSize(10);
    const lines = doc.splitTextToSize(text, pageW - M * 2) as string[];
    for (const line of lines) {
      ensure(14);
      doc.text(line, M, y);
      y += 14;
    }
  };

  const bullets = (title: string, items: string[]) => {
    if (!items.length) return;
    heading(title);
    for (const item of items) {
      const lines = doc.splitTextToSize(`•  ${item}`, pageW - M * 2 - 8) as string[];
      doc.setFont("helvetica", "normal").setFontSize(10);
      for (const line of lines) {
        ensure(14);
        doc.text(line, M + 8, y);
        y += 14;
      }
    }
    y += 8;
  };

  // Leaf image
  if (input.imageUrl) {
    const img = await loadImage(input.imageUrl);
    if (img) {
      const w = 200;
      const h = Math.min(200, (img.h / img.w) * w);
      ensure(h + 12);
      try {
        doc.addImage(img.dataUrl, "JPEG", M, y, w, h);
        y += h + 16;
      } catch {
        /* unsupported image encoding — skip */
      }
    }
  }

  // Diagnosis summary table
  heading("Diagnosis");
  const rows: Array<[string, string]> = [
    ["Status", input.isHealthy ? "Healthy" : "Disease detected"],
    ["Crop", input.crop],
    ["Diagnosis", input.disease ?? (input.isHealthy ? "No disease found" : "Unknown")],
    ["Confidence", input.confidence != null ? `${input.confidence}%` : "—"],
    ["Severity", input.severity ?? "—"],
    ["Affected part", input.plantPart ?? "—"],
    ["Scanned on", new Date(input.createdAt).toLocaleString()],
    ["Location", input.location ?? input.weather?.place ?? "Not recorded"],
  ];
  doc.setFontSize(10);
  for (const [label, value] of rows) {
    ensure(16);
    doc.setFont("helvetica", "bold").text(label, M, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value, pageW - M * 2 - 120) as string[];
    doc.text(lines[0] ?? "—", M + 120, y);
    y += 16;
    for (const extra of lines.slice(1)) {
      ensure(14);
      doc.text(extra, M + 120, y);
      y += 14;
    }
  }
  y += 8;

  if (input.summary) {
    heading("Summary");
    body(input.summary);
    y += 8;
  }

  bullets("Symptoms", input.symptoms);
  bullets("Causes", input.causes);
  bullets("Organic treatment", input.organic);
  bullets("Chemical treatment", input.chemical);
  bullets("Prevention", input.prevention);

  if (input.weather) {
    const w = input.weather;
    heading("Weather at scan time");
    body(
      `${w.condition} · ${w.temperature}°C · Humidity ${w.humidity}% · Rain 24h ${w.rainfall} mm · Wind ${w.wind} km/h · UV ${w.uvIndex}`,
    );
    body(
      `Recorded at ${w.place ?? `${w.latitude.toFixed(2)}, ${w.longitude.toFixed(2)}`} on ${new Date(w.observedAt).toLocaleString()}`,
    );
    y += 8;
  }

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(120, 120, 120);
    doc.text(
      "CropCare AI report — advisory only. Confirm chemical dosages with a local agronomist.",
      M,
      pageH - 24,
    );
    doc.text(`Page ${p} of ${pages}`, pageW - M, pageH - 24, { align: "right" });
  }

  const slug = (input.disease ?? (input.isHealthy ? "healthy" : "report"))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  doc.save(`cropcare-${slug}-${new Date(input.createdAt).toISOString().slice(0, 10)}.pdf`);
}