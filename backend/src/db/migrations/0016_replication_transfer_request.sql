ALTER TABLE "file_transfer_requests" REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE "file_transfer_requests";