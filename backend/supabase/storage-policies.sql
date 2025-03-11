-- Enable Row Level Security
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for the article-images bucket
CREATE POLICY "Allow public read access" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'article-images');

CREATE POLICY "Allow authenticated users to upload" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'article-images'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Allow authenticated users to update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'article-images'
    AND auth.role() = 'authenticated'
  )
  WITH CHECK (
    bucket_id = 'article-images'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Allow authenticated users to delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'article-images'
    AND auth.role() = 'authenticated'
  ); 