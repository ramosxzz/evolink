-- Replacing an avatar uses upsert, which needs the owner to be able to select
-- the existing object. The bucket is public, so this reveals nothing new.
create policy "avatars owner reads" on storage.objects for select to authenticated using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
);
