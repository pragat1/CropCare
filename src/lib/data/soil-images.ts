import clay from "@/assets/soil-clay.jpg";
import loamy from "@/assets/soil-loamy.jpg";
import sandy from "@/assets/soil-sandy.jpg";
import silt from "@/assets/soil-silt.jpg";

export const SOIL_IMAGES: Record<string, string> = {
  Clay: clay,
  Loamy: loamy,
  Sandy: sandy,
  Silt: silt,
};

export const SOIL_SLUGS: Record<string, string> = {
  clay: "Clay",
  loamy: "Loamy",
  sandy: "Sandy",
  silt: "Silt",
};
