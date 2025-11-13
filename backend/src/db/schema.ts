import { pgTable, uuid, text, timestamp, varchar, jsonb, bigint, index, boolean, pgPolicy } from 'drizzle-orm/pg-core';
import { InferInsertModel, InferSelectModel, sql } from 'drizzle-orm';

// Users table schema
export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    username: text('username').notNull().unique(),
    displayName: text('display_name'),
    personalMessage: text('personal_message'),
    displayPictureUrl: text('display_picture_url'),
    presenceStatus: varchar('presence_status', { length: 20 }).default('offline'),
    isAiBot: boolean('is_ai_bot').default(false),
    aiBotPersonality: text('ai_bot_personality'),
    lastSeen: timestamp('last_seen'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (table) => [
    index('idx_users_email').on(table.email),
    index('idx_users_username').on(table.username),
    index('idx_users_presence_status').on(table.presenceStatus),
    index('idx_users_is_ai_bot').on(table.isAiBot),
    pgPolicy('users_can_view_own_profile_and_contacts_profiles', {
        for: 'select',
        to: 'public',
        using: sql`
            id = auth.uid() OR
            is_ai_bot = TRUE OR
            EXISTS (
                SELECT 1 FROM contacts
                WHERE (user_id = auth.uid() AND contact_user_id = users.id AND status = 'accepted')
                   OR (contact_user_id = auth.uid() AND user_id = users.id AND status = 'accepted')
            )
        `,
    }),
]);

export const userProfilePictures = pgTable('user_profile_pictures', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    fileName: text('file_name').notNull(),
    pictureUrl: text('picture_url').notNull(),
    storagePath: text('storage_path').notNull(),
    uploadedAt: timestamp('uploaded_at').defaultNow(),
}, (table) => [
    index('idx_user_profile_pictures_user_id').on(table.userId),
    index('idx_user_profile_pictures_uploaded_at').on(table.uploadedAt.desc()),
    pgPolicy('users_can_view_own_profile_pictures', {
        for: 'select',
        to: 'public',
        using: sql`user_id = auth.uid()`,
    }),
]);


// Contacts table schema
export const contacts = pgTable('contacts', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    contactUserId: uuid('contact_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 20 }).default('pending'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (table) => [
    index('idx_contacts_user_id').on(table.userId),
    index('idx_contacts_contact_user_id').on(table.contactUserId),
    index('idx_contacts_status').on(table.status),
    pgPolicy('users_can_view_own_contacts', {
        for: 'select',
        to: 'public',
        using: sql`user_id = auth.uid() OR contact_user_id = auth.uid()`,
    }),
]);

// Conversations table schema
export const conversations = pgTable('conversations', {
    id: uuid('id').primaryKey().defaultRandom(),
    type: varchar('type', { length: 20 }).notNull(),
    name: text('name'),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (table) => [
    index('idx_conversations_created_by').on(table.createdBy),
    index('idx_conversations_type').on(table.type),
    pgPolicy('users_can_view_own_conversations', {
        for: 'select',
        to: 'public',
        using: sql`
            EXISTS (
                SELECT 1 FROM conversation_participants
                WHERE conversation_id = conversations.id
                AND user_id = auth.uid()
            )
        `,
    }),
]);

// Conversation participants table schema
export const conversationParticipants = pgTable('conversation_participants', {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at').defaultNow(),
    leftAt: timestamp('left_at'),
}, (table) => [
    index('idx_conversation_participants_conversation_id').on(table.conversationId),
    index('idx_conversation_participants_user_id').on(table.userId),
    index('idx_conversation_participants_left_at').on(table.leftAt),
    pgPolicy('users_can_view_conversation_participants', {
        for: 'select',
        to: 'public',
        using: sql`
            EXISTS (
                SELECT 1 FROM conversation_participants cp
                WHERE cp.conversation_id = conversation_participants.conversation_id
                AND cp.user_id = auth.uid()
            )
        `,
    }),
]);

// Messages table schema
export const messages = pgTable('messages', {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id').notNull(),
    senderId: uuid('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    messageType: varchar('message_type', { length: 20 }).default('text'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow(),
    deliveredAt: timestamp('delivered_at'),
    readAt: timestamp('read_at'),
}, (table) => [
    index('idx_messages_conversation_id').on(table.conversationId, table.createdAt.desc()),
    index('idx_messages_sender_id').on(table.senderId),
    index('idx_messages_created_at').on(table.createdAt.desc()),
    pgPolicy('users_can_view_messages_in_their_conversations', {
        for: 'select',
        to: 'public',
        using: sql`
            EXISTS (
                SELECT 1 FROM conversation_participants
                WHERE conversation_id = messages.conversation_id
                AND user_id = auth.uid()
                AND left_at IS NULL
            )
        `,
    }),
]);

// Files table schema
export const files = pgTable('files', {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id').references(() => messages.id, { onDelete: 'cascade' }),
    filename: text('filename').notNull(),
    fileSize: bigint('file_size', { mode: 'number' }).notNull(),
    mimeType: text('mime_type').notNull(),
    storagePath: text('storage_path').notNull(),
    uploadStatus: varchar('upload_status', { length: 20 }).default('pending'),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
    index('idx_files_message_id').on(table.messageId),
    pgPolicy('users_can_view_files_in_their_conversations', {
        for: 'select',
        to: 'public',
        using: sql`
            EXISTS (
                SELECT 1 FROM messages m
                JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
                WHERE m.id = files.message_id
                AND cp.user_id = auth.uid()
                AND cp.left_at IS NULL
            )
        `,
    }),
]);

export type SelectUser = InferSelectModel<typeof users>;
export type InsertUser = InferInsertModel<typeof users>;

export type SelectContact = InferSelectModel<typeof contacts>;
export type InsertContact = InferInsertModel<typeof contacts>;

export type SelectConversation = InferSelectModel<typeof conversations>;
export type InsertConversation = InferInsertModel<typeof conversations>;

export type SelectConversationParticipant = InferSelectModel<typeof conversationParticipants>;
export type InsertConversationParticipant = InferInsertModel<typeof conversationParticipants>;

export type SelectMessage = InferSelectModel<typeof messages>;
export type InsertMessage = InferInsertModel<typeof messages>;

export type SelectFile = InferSelectModel<typeof files>;
export type InsertFile = InferInsertModel<typeof files>;

export type SelectUserProfilePicture = InferSelectModel<typeof userProfilePictures>;
export type InsertUserProfilePicture = InferInsertModel<typeof userProfilePictures>;