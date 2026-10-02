import { diseaseImageUrl } from "@/components/disease-reference-image";
import { list, str } from "@/lib/admin/library";
import type { ContentItem } from "@/lib/admin/schema";

export type DiseaseReference = {
  id: string;
  slug: string;
  name: string;
  crop: string;
  type: string;
  scientificName: string;
  summary: string;
  symptoms: string[];
  causes: string[];
  organic: string[];
  chemical: string[];
  preventive: string[];
  imageUrl: string | null;
};

export function toDiseaseReference(item: ContentItem): DiseaseReference {
  return {
    id: item.id,
    slug: item.slug,
    name: item.title,
    crop: str(item.data.crop),
    type: str(item.data.type),
    scientificName: str(item.data.scientific_name),
    summary: str(item.data.summary),
    symptoms: list(item.data.symptoms),
    causes: list(item.data.causes),
    organic: list(item.data.organic),
    chemical: list(item.data.chemical),
    preventive: list(item.data.preventive),
    imageUrl: diseaseImageUrl(item.data),
  };
}
