-- Add excerpt column to articles table
ALTER TABLE articles 
ADD COLUMN excerpt TEXT;

-- Update existing rows to have an excerpt (optional)
UPDATE articles 
SET excerpt = SUBSTRING(content, 1, 200) 
WHERE excerpt IS NULL; 