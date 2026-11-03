-- Sample scans must be clearly identifiable, never mistaken for real scans.
-- Rows flagged is_sample are labelled "Sample" in the UI and deletable like any other scan.
ALTER TABLE public.detections
  ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.detections.is_sample IS 'True for demo/sample scans added via "Load sample farm data"; shown with a Sample badge in the UI.';