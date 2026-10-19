-- Storage bucket settings the application expects. Apply once per Supabase project (SQL editor or psql).
-- Images are served publicly by URL. Downloadable files are private: the API only ever hands out
-- short lived signed URLs after checking the buyer's order. The limits below are enforced by Supabase
-- itself, in addition to the checks the API makes when it signs and confirms an upload.

update storage.buckets
set public = true,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('avatars', 'products');

update storage.buckets
set public = false,
    file_size_limit = 26214400,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/zip', 'application/x-zip-compressed',
      'application/epub+zip',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword', 'application/vnd.ms-excel', 'audio/mpeg', 'audio/mp4', 'video/mp4'
    ]
where id = 'downloadables';
