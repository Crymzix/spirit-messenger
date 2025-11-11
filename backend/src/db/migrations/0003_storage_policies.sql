-- ============================================================================
-- STORAGE BUCKET POLICIES
-- ============================================================================

-- Display Pictures Bucket Policies
-- Users can read their own display pictures and their contacts' display pictures
CREATE POLICY "Users can view own and contacts' display pictures"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'display-pictures' AND (
      auth.uid()::text = (storage.foldername(name))[1] OR
      EXISTS (
        SELECT 1 FROM contacts
        WHERE bucket_id = 'display-pictures'
        AND (
          (user_id = auth.uid() AND contact_user_id::text = (storage.foldername(name))[1] AND status = 'accepted')
          OR
          (contact_user_id = auth.uid() AND user_id::text = (storage.foldername(name))[1] AND status = 'accepted')
        )
      )
    )
  );

-- File Transfers Bucket Policies
-- Users can read files from conversations they are part of
CREATE POLICY "Users can view files from their conversations"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'file-transfers' AND
    EXISTS (
      SELECT 1 FROM files f
      JOIN messages m ON m.id = f.message_id
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE f.storage_path = name
      AND cp.user_id = auth.uid()
      AND cp.left_at IS NULL
    )
  );

-- Note: INSERT, UPDATE, DELETE policies are not created for frontend
-- All write operations to storage are handled by Backend Service using service role key