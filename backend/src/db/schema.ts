import { pgTable, uuid, text, timestamp, varchar, jsonb, bigint, index, boolean, pgPolicy, integer, doublePrecision } from 'drizzle-orm/pg-core';
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
            id = (select auth.uid()) OR
            is_ai_bot = TRUE OR
            EXISTS (
                SELECT 1 FROM contacts
                WHERE (user_id = (select auth.uid()) AND contact_user_id = users.id AND status = 'accepted')
                   OR (contact_user_id = (select auth.uid()) AND user_id = users.id AND status = 'accepted')
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
        using: sql`user_id = (select auth.uid())`,
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
        using: sql`user_id = (select auth.uid()) OR contact_user_id = (select auth.uid())`,
    }),
]);

// Contact groups table schema
export const contactGroups = pgTable('contact_groups', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    displayOrder: integer('display_order').default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (table) => [
    index('idx_contact_groups_user_id').on(table.userId, table.displayOrder),
    pgPolicy('users_can_view_own_contact_groups', {
        for: 'select',
        to: 'public',
        using: sql`user_id = (select auth.uid())`,
    }),
]);

// Contact group memberships table schema
export const contactGroupMemberships = pgTable('contact_group_memberships', {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id').notNull().references(() => contactGroups.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
    index('idx_contact_group_memberships_group_id').on(table.groupId),
    index('idx_contact_group_memberships_contact_id').on(table.contactId),
    pgPolicy('users_can_view_own_group_memberships', {
        for: 'select',
        to: 'public',
        using: sql`
            EXISTS (
                SELECT 1 FROM contact_groups
                WHERE contact_groups.id = contact_group_memberships.group_id
                AND contact_groups.user_id = (select auth.uid())
            )
        `,
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
                AND user_id = (select auth.uid())
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
    // Allow users to see their own participant record
    // Cannot use self-referential query or query conversations (causes circular dependency)
    pgPolicy('users_can_view_conversation_participants', {
        for: 'select',
        to: 'public',
        using: sql`user_id = (select auth.uid())`,
    }),
]);

// Messages table schema
export const messages = pgTable('messages', {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
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
                AND user_id = (select auth.uid())
                AND left_at IS NULL
            )
        `,
    }),
]);

// File transfer requests table schema
export const fileTransferRequests = pgTable('file_transfer_requests', {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    receiverId: uuid('receiver_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    filename: text('filename').notNull(),
    fileSize: bigint('file_size', { mode: 'number' }).notNull(),
    mimeType: text('mime_type').notNull(),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    messageId: uuid('message_id').references(() => messages.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (table) => [
    index('idx_file_transfer_requests_conversation_id').on(table.conversationId),
    index('idx_file_transfer_requests_sender_id').on(table.senderId),
    index('idx_file_transfer_requests_receiver_id').on(table.receiverId),
    index('idx_file_transfer_requests_status').on(table.status),
    index('idx_file_transfer_requests_expires_at').on(table.expiresAt),
    pgPolicy('users_can_view_file_transfer_requests_in_their_conversations', {
        for: 'select',
        to: 'public',
        using: sql`
            sender_id = (select auth.uid()) OR receiver_id = (select auth.uid())
        `,
    }),
]);

// Files table schema
export const files = pgTable('files', {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id').references(() => messages.id, { onDelete: 'cascade' }),
    transferRequestId: uuid('transfer_request_id').references(() => fileTransferRequests.id, { onDelete: 'cascade' }),
    filename: text('filename').notNull(),
    fileSize: bigint('file_size', { mode: 'number' }).notNull(),
    mimeType: text('mime_type').notNull(),
    storagePath: text('storage_path').notNull(),
    uploadStatus: varchar('upload_status', { length: 20 }).default('pending'),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
    index('idx_files_message_id').on(table.messageId),
    index('idx_files_transfer_request_id').on(table.transferRequestId),
    pgPolicy('users_can_view_files_in_their_conversations', {
        for: 'select',
        to: 'public',
        using: sql`
            EXISTS (
                SELECT 1 FROM messages m
                JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
                WHERE m.id = files.message_id
                AND cp.user_id = (select auth.uid())
                AND cp.left_at IS NULL
            )
        `,
    }),
]);

// AI Conversations table schema
export const aiConversations = pgTable('ai_conversations', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (table) => [
    index('idx_ai_conversations_user_id').on(table.userId),
    index('idx_ai_conversations_updated_at').on(table.updatedAt.desc()),
    pgPolicy('users_can_view_own_ai_conversations', {
        for: 'select',
        to: 'public',
        using: sql`user_id = (select auth.uid())`,
    }),
]);

// AI Messages table schema
export const aiMessages = pgTable('ai_messages', {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id').notNull().references(() => aiConversations.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull(), // 'user' | 'assistant'
    content: text('content').notNull(),
    metadata: jsonb('metadata'), // sources, model, webSearchEnabled, etc.
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
    index('idx_ai_messages_conversation_id').on(table.conversationId, table.createdAt.desc()),
    index('idx_ai_messages_created_at').on(table.createdAt.desc()),
    pgPolicy('users_can_view_own_ai_messages', {
        for: 'select',
        to: 'public',
        using: sql`
            EXISTS (
                SELECT 1 FROM ai_conversations
                WHERE ai_conversations.id = ai_messages.conversation_id
                AND ai_conversations.user_id = (select auth.uid())
            )
        `,
    }),
]);

// Bot configuration table schema
export const botConfigs = pgTable('bot_configs', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    personalityTemplate: varchar('personality_template', { length: 50 }).notNull(), // 'friendly', 'professional', 'quirky', etc.
    customPersonalityConfig: jsonb('custom_personality_config'), // extends template with custom traits
    responseDelayMin: integer('response_delay_min').default(1000), // ms
    responseDelayMax: integer('response_delay_max').default(5000), // ms
    typingSpeed: integer('typing_speed').default(50), // ms per character
    autonomousMessagingEnabled: boolean('autonomous_messaging_enabled').default(true),
    autonomousIntervalMin: integer('autonomous_interval_min').default(300000), // 5 min
    autonomousIntervalMax: integer('autonomous_interval_max').default(3600000), // 60 min
    ignoreMessageProbability: doublePrecision('ignore_message_probability').default(0.1), // 10% chance to ignore
    nudgeProbability: doublePrecision('nudge_probability').default(0.05), // 5% chance to nudge
    voiceClipProbability: doublePrecision('voice_clip_probability').default(0.02), // 2% chance to send voice
    emoticonUsageFrequency: doublePrecision('emoticon_usage_frequency').default(0.3), // 30% of messages
    webSearchEnabled: boolean('web_search_enabled').default(true),
    voiceConfig: jsonb('voice_config'), // TTS voice settings
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (table) => [
    index('idx_bot_configs_user_id').on(table.userId),
]);

// Bot conversation context table schema
export const botConversationContexts = pgTable('bot_conversation_contexts', {
    id: uuid('id').primaryKey().defaultRandom(),
    botUserId: uuid('bot_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
    contextHistory: jsonb('context_history'), // Array of messages for LLM context
    conversationSummary: text('conversation_summary'), // Summary of older messages
    lastInteractionAt: timestamp('last_interaction_at'),
    interactionCount: integer('interaction_count').default(0),
    unansweredCount: integer('unanswered_count').default(0), // Consecutive unanswered autonomous messages
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (table) => [
    index('idx_bot_conversation_contexts_bot_conversation').on(table.botUserId, table.conversationId),
]);

// Bot autonomous message schedule table schema
export const botAutonomousSchedules = pgTable('bot_autonomous_schedules', {
    id: uuid('id').primaryKey().defaultRandom(),
    botUserId: uuid('bot_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    lastAutonomousMessageAt: timestamp('last_autonomous_message_at'),
    nextScheduledCheck: timestamp('next_scheduled_check'),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
    index('idx_bot_autonomous_schedules_bot_user_id').on(table.botUserId),
    index('idx_bot_autonomous_schedules_next_check').on(table.nextScheduledCheck),
]);

// Bot action logs table schema
export const botActionLogs = pgTable('bot_action_logs', {
    id: uuid('id').primaryKey().defaultRandom(),
    botUserId: uuid('bot_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }),
    actionType: varchar('action_type', { length: 50 }).notNull(), // 'nudge', 'voice_clip', 'web_search', 'emoticon'
    actionMetadata: jsonb('action_metadata'),
    createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
    index('idx_bot_action_logs_bot_user_id').on(table.botUserId),
    index('idx_bot_action_logs_conversation_id').on(table.conversationId),
    index('idx_bot_action_logs_action_type').on(table.actionType),
    index('idx_bot_action_logs_created_at').on(table.createdAt.desc()),
]);

export type SelectUser = InferSelectModel<typeof users>;
export type InsertUser = InferInsertModel<typeof users>;

export type SelectContact = InferSelectModel<typeof contacts>;
export type InsertContact = InferInsertModel<typeof contacts>;

export type SelectContactGroup = InferSelectModel<typeof contactGroups>;
export type InsertContactGroup = InferInsertModel<typeof contactGroups>;

export type SelectContactGroupMembership = InferSelectModel<typeof contactGroupMemberships>;
export type InsertContactGroupMembership = InferInsertModel<typeof contactGroupMemberships>;

export type SelectConversation = InferSelectModel<typeof conversations>;
export type InsertConversation = InferInsertModel<typeof conversations>;

export type SelectConversationParticipant = InferSelectModel<typeof conversationParticipants>;
export type InsertConversationParticipant = InferInsertModel<typeof conversationParticipants>;

export type SelectMessage = InferSelectModel<typeof messages>;
export type InsertMessage = InferInsertModel<typeof messages>;

export type SelectFile = InferSelectModel<typeof files>;
export type InsertFile = InferInsertModel<typeof files>;

export type SelectFileTransferRequest = InferSelectModel<typeof fileTransferRequests>;
export type InsertFileTransferRequest = InferInsertModel<typeof fileTransferRequests>;

export type SelectUserProfilePicture = InferSelectModel<typeof userProfilePictures>;
export type InsertUserProfilePicture = InferInsertModel<typeof userProfilePictures>;

export type SelectAIConversation = InferSelectModel<typeof aiConversations>;
export type InsertAIConversation = InferInsertModel<typeof aiConversations>;

export type SelectAIMessage = InferSelectModel<typeof aiMessages>;
export type InsertAIMessage = InferInsertModel<typeof aiMessages>;

export type SelectBotConfig = InferSelectModel<typeof botConfigs>;
export type InsertBotConfig = InferInsertModel<typeof botConfigs>;

export type SelectBotConversationContext = InferSelectModel<typeof botConversationContexts>;
export type InsertBotConversationContext = InferInsertModel<typeof botConversationContexts>;

export type SelectBotAutonomousSchedule = InferSelectModel<typeof botAutonomousSchedules>;
export type InsertBotAutonomousSchedule = InferInsertModel<typeof botAutonomousSchedules>;

export type SelectBotActionLog = InferSelectModel<typeof botActionLogs>;
export type InsertBotActionLog = InferInsertModel<typeof botActionLogs>;