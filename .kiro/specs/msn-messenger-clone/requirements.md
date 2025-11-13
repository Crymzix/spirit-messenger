# Requirements Document

## Introduction

This document outlines the requirements for building a desktop application that replicates the functionality and user interface of the original MSN Messenger. The application will be built using Tauri (Rust-based framework) for cross-platform desktop support, React with TailwindCSS for the UI, a separate Backend Service for handling write operations, and Supabase for real-time data subscriptions and read operations. The system will include core messaging features, contact management, presence indicators, and AI chatbot companions for users without contacts. The architecture separates concerns by routing all write operations through the Backend Service while allowing the frontend to read directly from Supabase for optimal real-time performance.

## Glossary

- **MSN Messenger Application**: The desktop application being developed that replicates MSN Messenger functionality
- **User**: A person who has registered and uses the MSN Messenger Application
- **Contact**: Another User that has been added to a User's contact list
- **Presence Status**: The availability state of a User (Online, Away, Busy, Appear Offline)
- **Chat Session**: An active conversation between two or more Users
- **AI Bot**: An artificial intelligence-powered user account that participates in conversations like a regular User
- **OpenRouter**: A unified API service that provides access to multiple LLM providers for AI Bot responses
- **Backend Service**: A separate server application that handles all write operations including authentication, message sending, and data mutations
- **Supabase Database**: The PostgreSQL database providing data storage and real-time subscriptions for read operations
- **Tauri Runtime**: The Rust-based framework providing native desktop capabilities
- **Contact List**: The collection of Contacts associated with a User's account
- **Kebab Case**: A naming convention where words are lowercase and separated by hyphens (e.g., user-profile.ts, chat-window.tsx)

## Requirements

### Requirement 1: User Authentication and Account Management

**User Story:** As a user, I want to create an account and sign in securely, so that I can access my contacts and chat history across sessions.

#### Acceptance Criteria

1. THE MSN Messenger Application SHALL provide a registration interface that collects username, email address, and password
2. WHEN a User submits valid registration credentials, THE MSN Messenger Application SHALL send the credentials to the Backend Service which creates a new account
3. THE MSN Messenger Application SHALL provide a sign-in interface that accepts email address and password
4. WHEN a User submits valid sign-in credentials, THE MSN Messenger Application SHALL authenticate the User through the Backend Service and receive an authentication token
5. WHEN a User selects the sign-out option, THE MSN Messenger Application SHALL send a sign-out request to the Backend Service, terminate the authenticated session, and return to the sign-in interface

### Requirement 2: Contact Management

**User Story:** As a user, I want to add, remove, and organize my contacts, so that I can manage who I communicate with.

#### Acceptance Criteria

1. THE MSN Messenger Application SHALL read and display the Contact List from the Supabase Database showing all Contacts with their current Presence Status
2. WHEN a User initiates the add contact action with a valid email address, THE MSN Messenger Application SHALL send a contact request to the Backend Service
3. WHEN a User receives a contact request, THE MSN Messenger Application SHALL display a notification with options to accept or decline
4. WHEN a User accepts a contact request, THE MSN Messenger Application SHALL send the acceptance to the Backend Service which adds the requesting User to the Contact List
5. WHEN a User selects the remove contact action for a Contact, THE MSN Messenger Application SHALL send the removal request to the Backend Service which removes that Contact from the Contact List

### Requirement 3: Presence and Status Management

**User Story:** As a user, I want to set my availability status and see my contacts' statuses, so that others know when I'm available to chat.

#### Acceptance Criteria

1. THE MSN Messenger Application SHALL allow a User to select from predefined Presence Status options (Online, Away, Busy, Appear Offline)
2. WHEN a User changes their Presence Status, THE MSN Messenger Application SHALL send the status update to the Backend Service which updates the Supabase Database within 2 seconds
3. WHEN a Contact changes their Presence Status, THE MSN Messenger Application SHALL receive the update via Supabase real-time subscription and update the displayed status in the Contact List within 5 seconds
4. THE MSN Messenger Application SHALL allow a User to set a custom status message of up to 150 characters
5. WHEN a User sets a custom status message, THE MSN Messenger Application SHALL send the message to the Backend Service which stores it and displays it alongside the User's Presence Status to all Contacts

### Requirement 4: One-on-One Chat Functionality

**User Story:** As a user, I want to send and receive instant messages with my contacts, so that I can have real-time conversations.

#### Acceptance Criteria

1. WHEN a User selects a Contact from the Contact List, THE MSN Messenger Application SHALL open a Chat Session window and load message history from the Supabase Database
2. WHEN a User types a message and sends it during a Chat Session, THE MSN Messenger Application SHALL send the message to the Backend Service which persists it to the Supabase Database within 1 second
3. WHEN a User receives a message, THE MSN Messenger Application SHALL receive it via Supabase real-time subscription and display the message in the Chat Session window with timestamp and sender identification
4. WHEN a User receives a message while the Chat Session window is not focused, THE MSN Messenger Application SHALL display a desktop notification
5. THE MSN Messenger Application SHALL read chat history from the Supabase Database and display previous messages when a Chat Session is opened

### Requirement 5: Emoticons and Rich Text

**User Story:** As a user, I want to use emoticons and text formatting in my messages, so that I can express myself more effectively.

#### Acceptance Criteria

1. THE MSN Messenger Application SHALL provide a palette of at least 20 classic MSN Messenger emoticons
2. WHEN a User selects an emoticon, THE MSN Messenger Application SHALL insert the emoticon into the message composition area
3. WHEN a User types an emoticon shortcut (e.g., ":)" or ":P"), THE MSN Messenger Application SHALL automatically convert it to the corresponding emoticon graphic
4. THE MSN Messenger Application SHALL support basic text formatting options including bold, italic, and font color selection
5. WHEN a User sends a message with emoticons or formatting, THE MSN Messenger Application SHALL preserve and display the formatting for the recipient

### Requirement 6: Group Chat Functionality

**User Story:** As a user, I want to create group conversations with multiple contacts, so that I can chat with several people simultaneously.

#### Acceptance Criteria

1. THE MSN Messenger Application SHALL allow a User to initiate a group Chat Session by selecting multiple Contacts
2. WHEN a User creates a group Chat Session, THE MSN Messenger Application SHALL send the group creation request to the Backend Service which creates the conversation and sends invitations to all selected Contacts
3. WHEN a User sends a message in a group Chat Session, THE MSN Messenger Application SHALL send the message to the Backend Service which persists it and delivers it to all participants within 2 seconds via Supabase real-time subscriptions
4. THE MSN Messenger Application SHALL read and display all participants' names and Presence Status from the Supabase Database in the group Chat Session window
5. WHEN a participant leaves a group Chat Session, THE MSN Messenger Application SHALL send the leave request to the Backend Service which updates the conversation and notifies all remaining participants via Supabase real-time subscriptions

### Requirement 7: File Transfer

**User Story:** As a user, I want to send files to my contacts during conversations, so that I can share documents and images.

#### Acceptance Criteria

1. WHEN a User initiates a file transfer during a Chat Session, THE MSN Messenger Application SHALL allow selection of files up to 100 MB in size
2. WHEN a User sends a file, THE MSN Messenger Application SHALL upload the file to the Backend Service which stores it and displays a transfer progress indicator showing percentage completion
3. WHEN a User receives a file transfer request, THE MSN Messenger Application SHALL receive the notification via Supabase real-time subscription and display options to accept or decline
4. WHEN a User accepts a file transfer, THE MSN Messenger Application SHALL send the acceptance to the Backend Service and download the file from the Backend Service to a designated folder
5. THE MSN Messenger Application SHALL read file transfer status from the Supabase Database and display status (pending, in progress, completed, failed) in the Chat Session window

### Requirement 8: Audio and Visual Notifications

**User Story:** As a user, I want to receive sound and visual alerts for important events, so that I don't miss messages or contact status changes.

#### Acceptance Criteria

1. WHEN a User receives a new message, THE MSN Messenger Application SHALL play a distinctive notification sound
2. WHEN a Contact changes to Online status, THE MSN Messenger Application SHALL play a sign-in notification sound
3. WHEN a Contact changes to Offline status, THE MSN Messenger Application SHALL play a sign-out notification sound
4. THE MSN Messenger Application SHALL allow a User to enable or disable notification sounds in settings
5. WHEN a User receives a message while the application window is not focused, THE MSN Messenger Application SHALL display a system tray notification with message preview

### Requirement 9: User Profile and Display Picture

**User Story:** As a user, I want to customize my profile with a display picture and personal information, so that my contacts can recognize me easily.

#### Acceptance Criteria

1. THE MSN Messenger Application SHALL allow a User to upload a display picture in JPEG or PNG format up to 5 MB
2. WHEN a User uploads a display picture, THE MSN Messenger Application SHALL resize the image to 96x96 pixels and send it to the Backend Service which stores it
3. THE MSN Messenger Application SHALL read and display each Contact's display picture from the Supabase Database in the Contact List
4. THE MSN Messenger Application SHALL read and display the User's own display picture from the Supabase Database in the application header
5. THE MSN Messenger Application SHALL allow a User to edit profile information including display name and personal message and send updates to the Backend Service

### Requirement 10: AI Bot Companions

**User Story:** As a user with no contacts online, I want to chat with AI bots, so that I can still have engaging conversations.

#### Acceptance Criteria

1. WHEN a User has zero Contacts with Online Presence Status, THE MSN Messenger Application SHALL display available AI Bots in the Contact List with a distinctive visual indicator
2. THE MSN Messenger Application SHALL provide at least 3 different AI Bot personalities with distinct conversation styles, each represented as a User account
3. WHEN a User initiates a Chat Session with an AI Bot, THE MSN Messenger Application SHALL create a standard Conversation with the AI Bot as a participant
4. WHEN a User sends a message to an AI Bot in a Conversation, THE MSN Messenger Application SHALL send the message to the Backend Service which forwards it to OpenRouter and returns a response within 5 seconds
5. THE MSN Messenger Application SHALL read AI Bot conversation history from the Supabase Database using the standard Messages table, treating AI Bot messages identically to User messages
6. THE MSN Messenger Application SHALL allow multiple AI Bots to participate in a single group Conversation alongside human Users
7. WHEN an AI Bot is added to a group Conversation, THE Backend Service SHALL use OpenRouter to generate contextually appropriate responses based on all participants' messages

### Requirement 11: Classic MSN Messenger UI Replication

**User Story:** As a user familiar with the original MSN Messenger, I want the application to look and feel like the classic version, so that I have a nostalgic and familiar experience.

#### Acceptance Criteria

1. THE MSN Messenger Application SHALL replicate the visual design of MSN Messenger version 7.5 including color schemes, window layouts, and iconography
2. THE MSN Messenger Application SHALL display the Contact List in a vertical scrollable window with collapsible groups
3. THE MSN Messenger Application SHALL use the classic MSN Messenger window chrome and title bar styling
4. THE MSN Messenger Application SHALL replicate the original Chat Session window layout with message history area, composition area, and toolbar
5. THE MSN Messenger Application SHALL implement the classic MSN Messenger menu structure and navigation patterns

### Requirement 12: Cross-Platform Desktop Support

**User Story:** As a user on any desktop operating system, I want to run the application natively, so that I can use MSN Messenger regardless of my platform.

#### Acceptance Criteria

1. THE MSN Messenger Application SHALL run natively on Windows operating systems version 10 and later
2. THE MSN Messenger Application SHALL run natively on macOS operating systems version 11 and later
3. THE MSN Messenger Application SHALL run natively on Linux distributions with GTK 3.0 or later
4. THE MSN Messenger Application SHALL provide consistent functionality across all supported platforms
5. THE MSN Messenger Application SHALL use native system integrations including notifications, file dialogs, and system tray on each platform

### Requirement 13: Real-Time Synchronization

**User Story:** As a user, I want my messages and status updates to sync in real-time, so that conversations feel immediate and responsive.

#### Acceptance Criteria

1. WHEN a User sends a message, THE MSN Messenger Application SHALL receive a delivery confirmation from the Backend Service within 2 seconds
2. THE MSN Messenger Application SHALL establish a persistent WebSocket connection to the Supabase Database for real-time read subscriptions
3. WHEN the WebSocket connection is interrupted, THE MSN Messenger Application SHALL attempt reconnection every 5 seconds for up to 5 minutes
4. WHEN the WebSocket connection is restored, THE MSN Messenger Application SHALL synchronize any missed messages or status updates from the Supabase Database
5. THE MSN Messenger Application SHALL receive typing indicators via Supabase real-time subscriptions when a Contact is composing a message in an active Chat Session

### Requirement 14: Application Settings and Preferences

**User Story:** As a user, I want to customize application behavior and appearance, so that I can tailor the experience to my preferences.

#### Acceptance Criteria

1. THE MSN Messenger Application SHALL provide a settings interface accessible from the main menu
2. THE MSN Messenger Application SHALL allow a User to configure notification preferences including sound volume and desktop alerts
3. THE MSN Messenger Application SHALL allow a User to set the application to launch automatically when the operating system starts
4. THE MSN Messenger Application SHALL allow a User to configure the default save location for received files
5. THE MSN Messenger Application SHALL persist all User preferences locally and restore them on application restart

### Requirement 15: Search and Chat History

**User Story:** As a user, I want to search through my chat history, so that I can find past conversations and specific messages.

#### Acceptance Criteria

1. THE MSN Messenger Application SHALL provide a search interface that accepts text queries
2. WHEN a User submits a search query, THE MSN Messenger Application SHALL query the Supabase Database and return matching messages from all Chat Sessions within 3 seconds
3. THE MSN Messenger Application SHALL display search results with message content, sender, recipient, and timestamp
4. WHEN a User selects a search result, THE MSN Messenger Application SHALL open the relevant Chat Session and highlight the matching message
5. THE MSN Messenger Application SHALL allow filtering search results by Contact, date range, or Chat Session type when querying the Supabase Database

### Requirement 16: Custom Contact Groups

**User Story:** As a user, I want to organize my contacts into custom groups, so that I can categorize and manage my contacts more effectively.

#### Acceptance Criteria

1. THE MSN Messenger Application SHALL allow a User to create custom contact groups with names up to 50 characters
2. WHEN a User creates a new contact group, THE MSN Messenger Application SHALL send the group creation request to the Backend Service which persists the group to the Supabase Database
3. THE MSN Messenger Application SHALL allow a User to add Contacts to one or more custom groups
4. WHEN a User adds a Contact to a group, THE MSN Messenger Application SHALL send the assignment to the Backend Service which updates the Supabase Database
5. THE MSN Messenger Application SHALL read and display custom contact groups from the Supabase Database in the Contact List with collapsible group headers
6. THE MSN Messenger Application SHALL allow a User to rename custom contact groups by sending the update to the Backend Service
7. WHEN a User deletes a custom contact group, THE MSN Messenger Application SHALL send the deletion request to the Backend Service which removes the group without removing the Contacts
8. THE MSN Messenger Application SHALL allow a User to reorder custom contact groups using drag-and-drop
9. THE MSN Messenger Application SHALL display Contacts within each custom group sorted alphabetically by display name
10. THE MSN Messenger Application SHALL allow a User to remove a Contact from a custom group by sending the removal request to the Backend Service

### Requirement 17: Code Standards and Conventions

**User Story:** As a developer, I want consistent code naming conventions, so that the codebase is maintainable and follows best practices.

#### Acceptance Criteria

1. THE MSN Messenger Application SHALL name all TypeScript files using Kebab Case format
2. THE Backend Service SHALL name all TypeScript files using Kebab Case format
3. WHEN a developer creates a new TypeScript file, THE file name SHALL use lowercase letters with hyphens separating words
4. THE MSN Messenger Application SHALL apply Kebab Case naming to component files, utility files, service files, and type definition files
5. THE Backend Service SHALL apply Kebab Case naming to route files, service files, plugin files, and type definition files
