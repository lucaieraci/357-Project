-- Storage setup for food scan photos
-- Run this in Supabase SQL Editor after schema.sql

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'meal-photos',
  'meal-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/heic', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "meal_photos_insert_own_folder" on storage.objects;
create policy "meal_photos_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'meal-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "meal_photos_select_own_folder" on storage.objects;
create policy "meal_photos_select_own_folder"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'meal-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "meal_photos_update_own_folder" on storage.objects;
create policy "meal_photos_update_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'meal-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'meal-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "meal_photos_delete_own_folder" on storage.objects;
create policy "meal_photos_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'meal-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

