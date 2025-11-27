# Running Multiple Instances for Testing

This guide explains how to run multiple instances of the Spirit Messenger application simultaneously with different user accounts for testing purposes.

## Overview

By default, all instances of the application share the same storage, meaning you can only be logged in with one account at a time. To test with multiple users, you can use the `TAURI_PROFILE` environment variable to create isolated storage for each instance.

## How It Works

When you set the `TAURI_PROFILE` environment variable, the application:
- Creates a separate data directory for that profile under `profiles/<profile-name>/`
- Uses profile-specific localStorage keys for Supabase session data
- Keeps all authentication and application data completely isolated

## Usage

### Development Mode

```bash
# Terminal 1 - Run as user1
TAURI_PROFILE=user1 pnpm tauri dev

# Terminal 2 - Run as user2 (in a new terminal window)
TAURI_PROFILE=user2 pnpm tauri dev
```

### Production/Debug Build

```bash
# Build the application first
pnpm tauri build --debug

# Terminal 1 - Run as user1
TAURI_PROFILE=user1 ./src-tauri/target/debug/spirit-messenger

# Terminal 2 - Run as user2 (in a new terminal window)
TAURI_PROFILE=user2 ./src-tauri/target/debug/spirit-messenger
```

### macOS Production Build

```bash
# Build the application first
pnpm tauri build --debug

# Terminal 1 - Run as user1
TAURI_PROFILE=user1 open ./src-tauri/target/debug/bundle/macos/Spirit\ Messenger.app

# Terminal 2 - Run as user2 (in a new terminal window)
TAURI_PROFILE=user2 open ./src-tauri/target/debug/bundle/macos/Spirit\ Messenger.app
```

## Storage Locations

Without profile:
- **macOS**: `~/Library/Application Support/com.chrisli.spirit-messenger/`
- **Windows**: `C:\Users\<username>\AppData\Roaming\com.chrisli.spirit-messenger\`
- **Linux**: `~/.local/share/com.chrisli.spirit-messenger/`

With profile (e.g., `TAURI_PROFILE=user1`):
- **macOS**: `~/Library/Application Support/com.chrisli.spirit-messenger/profiles/user1/`
- **Windows**: `C:\Users\<username>\AppData\Roaming\com.chrisli.spirit-messenger\profiles\user1\`
- **Linux**: `~/.local/share/com.chrisli.spirit-messenger/profiles/user1/`

## Cleaning Up Test Data

To clear data for a specific profile, simply delete its directory:

```bash
# macOS example
rm -rf ~/Library/Application\ Support/com.chrisli.spirit-messenger/profiles/user1/

# Or clear all profiles
rm -rf ~/Library/Application\ Support/com.chrisli.spirit-messenger/profiles/
```

## Notes

- Each profile maintains its own:
  - Authentication tokens
  - User session data
  - Application settings
  - Window states
- You can run as many instances as you want by using different profile names
- Profile names can be any valid directory name (alphanumeric, hyphens, underscores)
- Running without `TAURI_PROFILE` uses the default storage location
