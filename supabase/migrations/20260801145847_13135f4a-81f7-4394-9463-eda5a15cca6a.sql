CREATE POLICY "assistant images own read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'assistant-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "assistant images own insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'assistant-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "assistant images own delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'assistant-images' AND auth.uid()::text = (storage.foldername(name))[1]);