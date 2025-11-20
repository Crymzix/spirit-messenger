# File Transfer Refactoring Required

## Current Status

Task 31.2 "Create file transfer routes" has been completed, but the implementation does NOT match the requirements. The current implementation immediately uploads files, which is incorrect.

## Problem

**Requirements 7.3 and 7.4 specify:**
- Receiver must accept or decline file transfers before they are sent
- This is the classic MSN Messenger behavior

**Current Implementation:**
- POST /api/files/upload immediately uploads the file to Supabase Storage
- No accept/decline flow exists
- Does not match the authentic MSN Messenger experience

## Required Changes

### Backend Changes (Task 31.3)

1. **Create new database table: `file_transfer_requests`**
   ```sql
   CREATE TABLE file_transfer_requests (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     conversation_id UUID NOT NULL REFERENCES conversations(id),
     sender_id UUID NOT NULL REFERENCES users(id),
     receiver_id UUID REFERENCES users(id), -- null for group chats
     filename TEXT NOT NULL,
     file_size BIGINT NOT NULL,
     mime_type TEXT NOT NULL,
     status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, declined, completed, expired, failed
     message_id UUID REFERENCES messages(id),
     file_id UUID REFERENCES files(id),
     created_at TIMESTAMP DEFAULT NOW(),
     responded_at TIMESTAMP,
     expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours'
   );
   ```

2. **Add new endpoints:**
   - `POST /api/files/initiate` - Create pending transfer request (no file upload)
   - `POST /api/files/transfer/:transferId/accept` - Accept transfer
   - `POST /api/files/transfer/:transferId/decline` - Decline transfer

3. **Modify existing endpoint:**
   - `POST /api/files/upload` - Require `transfer_id` parameter, only upload if status is "accepted"

4. **Add to file-service.ts:**
   - `createTransferRequest()`
   - `acceptTransferRequest()`
   - `declineTransferRequest()`
   - `getTransferRequestById()`
   - `updateTransferRequestStatus()`

### Frontend Changes (Tasks 32.3, 32.4, 32.5, 32.6)

1. **Sender Flow (Task 32.3):**
   - Select file via Tauri dialog
   - Call POST /api/files/initiate (send metadata only)
   - Display "Waiting for acceptance..." status
   - Listen for acceptance via Supabase Realtime
   - Upload file only after acceptance (Task 32.5)

2. **Receiver Flow (Task 32.4):**
   - Receive transfer request via Supabase Realtime
   - Display notification with Accept/Decline buttons
   - Call accept or decline endpoint
   - If accepted, wait for file upload to complete

3. **Download Flow (Task 32.6):**
   - After upload completes, display Download button
   - Download file from GET /api/files/:fileId/download
   - Save to designated folder via Tauri

## Migration Path

Since task 31.2 is marked complete but doesn't implement the correct flow:

1. Mark task 31.2 as "NEEDS UPDATE" (done)
2. Create new task 31.3 for refactoring (done)
3. Update frontend tasks to align with new flow (done)
4. Implement task 31.3 before frontend file transfer tasks
5. Test complete flow end-to-end

## Files Modified

- `.kiro/specs/msn-messenger-clone/tasks.md` - Updated tasks 31.2, 31.3, and all of task 20
- `.kiro/specs/msn-messenger-clone/design.md` - Added detailed file transfer flow section
- This document created to track refactoring requirements

## Next Steps

1. Implement task 31.3 (backend refactoring)
2. Create database migration for file_transfer_requests table
3. Update file-service.ts with new functions
4. Update files.ts routes
5. Test backend endpoints
6. Implement frontend tasks 32.3-32.6 in order
7. End-to-end testing

## References

- Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
- Design: File Transfer Flow section
- Tasks: 31.3, 32.3, 32.4, 32.5, 32.6
