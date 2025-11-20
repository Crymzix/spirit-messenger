use log::error;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, WebviewWindowBuilder, WindowEvent,
};

/// Represents a user in the authentication system
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthUser {
    pub id: String,
    pub email: String,
    pub username: String,
    pub display_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub personal_message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display_picture_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub presence_status: Option<String>,
}

/// Authentication data that includes user, access token, and refresh token
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthData {
    pub user: AuthUser,
    pub token: String,
    pub refresh_token: String,
}

/// Global application state
pub struct AppState {
    auth_data: Mutex<Option<AuthData>>,
    storage_path: PathBuf,
    profile: Option<String>,
}

impl AppState {
    /// Create a new AppState with storage at the given path
    pub fn new(storage_path: PathBuf, profile: Option<String>) -> Self {
        let mut state = Self {
            auth_data: Mutex::new(None),
            storage_path,
            profile,
        };

        // Load auth data from disk on initialization
        if let Err(e) = state.load_from_disk() {
            eprintln!("Failed to load auth data from disk: {}", e);
        }

        state
    }

    /// Load authentication data from disk
    fn load_from_disk(&mut self) -> Result<(), String> {
        if !self.storage_path.exists() {
            return Ok(());
        }

        let contents = fs::read_to_string(&self.storage_path)
            .map_err(|e| format!("Failed to read auth data file: {}", e))?;

        let auth_data: AuthData = serde_json::from_str(&contents)
            .map_err(|e| format!("Failed to parse auth data: {}", e))?;

        *self.auth_data.lock().unwrap() = Some(auth_data);

        Ok(())
    }

    /// Save authentication data to disk
    fn save_to_disk(&self) -> Result<(), String> {
        let auth_data = self.auth_data.lock().unwrap();

        if let Some(data) = auth_data.as_ref() {
            let json = serde_json::to_string_pretty(data)
                .map_err(|e| format!("Failed to serialize auth data: {}", e))?;

            // Ensure parent directory exists
            if let Some(parent) = self.storage_path.parent() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create storage directory: {}", e))?;
            }

            fs::write(&self.storage_path, json)
                .map_err(|e| format!("Failed to write auth data file: {}", e))?;
        } else {
            // If no auth data, delete the file
            if self.storage_path.exists() {
                fs::remove_file(&self.storage_path)
                    .map_err(|e| format!("Failed to remove auth data file: {}", e))?;
            }
        }

        Ok(())
    }
}

/// Get the current authenticated user
#[tauri::command]
fn get_user(state: tauri::State<AppState>) -> Option<AuthUser> {
    state
        .auth_data
        .lock()
        .unwrap()
        .as_ref()
        .map(|data| data.user.clone())
}

/// Get the current authentication token
#[tauri::command]
fn get_token(state: tauri::State<AppState>) -> Option<String> {
    state
        .auth_data
        .lock()
        .unwrap()
        .as_ref()
        .map(|data| data.token.clone())
}

/// Get the current refresh token
#[tauri::command]
fn get_refresh_token(state: tauri::State<AppState>) -> Option<String> {
    state
        .auth_data
        .lock()
        .unwrap()
        .as_ref()
        .map(|data| data.refresh_token.clone())
}

/// Set the authentication data (user, access token, and refresh token)
#[tauri::command]
fn set_auth(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
    user: AuthUser,
    token: String,
    refresh_token: String,
) -> Result<(), String> {
    *state.auth_data.lock().unwrap() = Some(AuthData {
        user: user.clone(),
        token,
        refresh_token,
    });
    state.save_to_disk()?;

    // Emit event to all windows
    let _ = app.emit("auth-changed", user);

    Ok(())
}

/// Update the current user's data
#[tauri::command]
fn update_user(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
    user_updates: AuthUser,
) -> Result<(), String> {
    let mut auth_data = state.auth_data.lock().unwrap();

    if let Some(data) = auth_data.as_mut() {
        data.user = user_updates.clone();
        drop(auth_data); // Release the lock before saving
        state.save_to_disk()?;

        // Emit event to all windows
        let _ = app.emit("auth-changed", user_updates);

        Ok(())
    } else {
        Err("No user is currently authenticated".to_string())
    }
}

/// Clear the authentication data (sign out)
#[tauri::command]
fn clear_auth(app: tauri::AppHandle, state: tauri::State<AppState>) -> Result<(), String> {
    *state.auth_data.lock().unwrap() = None;
    state.save_to_disk()?;

    // Emit event to all windows to clear auth
    let _ = app.emit("auth-cleared", ());

    Ok(())
}

/// Check if user is authenticated
#[tauri::command]
fn is_authenticated(state: tauri::State<AppState>) -> bool {
    state.auth_data.lock().unwrap().is_some()
}

/// Get the current profile name (for multi-instance support)
#[tauri::command]
fn get_profile(state: tauri::State<AppState>) -> Option<String> {
    state.profile.clone()
}

/// Request notification permission
#[tauri::command]
fn request_notification_permission(app: AppHandle) -> Result<String, String> {
    use tauri_plugin_notification::NotificationExt;

    let permission = app
        .notification()
        .request_permission()
        .map_err(|e| format!("Failed to request notification permission: {}", e))?;

    println!("Notification permission: {:?}", permission);
    Ok(format!("{:?}", permission))
}

/// Show a system notification with title and body
#[tauri::command]
async fn show_notification(app: AppHandle, title: String, body: String) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;

    // Check if permission is granted
    let permission = app
        .notification()
        .permission_state()
        .map_err(|e| format!("Failed to check notification permission: {}", e))?;

    println!("Notification permission state: {:?}", permission);

    // Show notification with sound
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .sound("default") // Add default system sound
        .show()
        .map_err(|e| {
            eprintln!("Failed to show notification: {}", e);
            format!("Failed to show notification: {}", e)
        })?;

    println!("Notification shown successfully");
    Ok(())
}

/// Play a sound file from the public/sounds directory
#[tauri::command]
async fn play_sound(app: AppHandle, sound_type: String, volume: f32) -> Result<(), String> {
    // Map sound types to file paths
    let sound_file = match sound_type.as_str() {
        "message" => "new_mesage.mp3",
        "contact_online" => "contact_online.mp3",
        "contact_offline" => "contact_online.mp3", // Reuse same sound for offline
        "nudge" => "nudge.mp3",
        "video_call" => "video_call.mp3",
        _ => return Err(format!("Unknown sound type: {}", sound_type)),
    };

    // Construct the asset URL
    let asset_url = format!("sounds/{}", sound_file);

    // Emit an event to the frontend to play the sound
    // We use the frontend's Audio API because Tauri doesn't have built-in audio playback
    app.emit(
        "play-sound",
        serde_json::json!({
            "soundFile": asset_url,
            "volume": volume.clamp(0.0, 1.0)
        }),
    )
    .map_err(|e| format!("Failed to emit play-sound event: {}", e))?;

    Ok(())
}

/// Open a file dialog for selecting a file to send
/// Note: In Tauri v2, file dialogs should be handled from the frontend
#[tauri::command]
async fn open_file_dialog(_app: AppHandle) -> Result<Option<String>, String> {
    // File dialog should be handled from frontend using HTML input element
    // This is a placeholder for compatibility
    Err("File dialog should be handled from frontend".to_string())
}

/// Save a file to the designated downloads folder
#[tauri::command]
async fn save_file(app: AppHandle, file_data: Vec<u8>, filename: String) -> Result<String, String> {
    // Get the downloads directory
    let downloads_dir = app
        .path()
        .download_dir()
        .map_err(|e| format!("Failed to get downloads directory: {}", e))?;

    // Create the full path
    let file_path = downloads_dir.join(&filename);

    // Write the file
    fs::write(&file_path, file_data).map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
fn open_chat_window(
    handle: AppHandle,
    _webview_window: tauri::WebviewWindow,
    dialog_window: String,
    contact_name: Option<String>,
) -> Result<(), String> {
    let dialog_label = format!("chat-{}", dialog_window);
    let title = contact_name
        .clone()
        .unwrap_or_else(|| dialog_window.clone());
    let url = if let Some(name) = contact_name {
        format!(
            "chat-window.html?contactId={}&contactName={}",
            dialog_window,
            urlencoding::encode(&name)
        )
    } else {
        format!("chat-window.html?contactId={}", dialog_window)
    };

    if let Some(existing_window) = handle.get_webview_window(&dialog_label) {
        if let Err(e) = existing_window.set_focus() {
            error!("Error focusing the chat window: {:?}", e);
        }
    } else {
        let _ =
            WebviewWindowBuilder::new(&handle, &dialog_label, tauri::WebviewUrl::App(url.into()))
                .title(title)
                .decorations(false)
                .resizable(true)
                .transparent(true)
                .inner_size(630.0, 530.0)
                .min_inner_size(600.0, 500.0)
                .center()
                .build()
                .unwrap();
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            // Get the app data directory for storage
            let mut app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");

            // Support multiple instances via TAURI_PROFILE environment variable
            // Usage: TAURI_PROFILE=user1 ./app or TAURI_PROFILE=user2 ./app
            let profile = std::env::var("TAURI_PROFILE").ok();
            if let Some(ref profile_name) = profile {
                // Create a profile-specific subdirectory
                app_data_dir = app_data_dir.join("profiles").join(profile_name);
                println!("Using profile: {}", profile_name);
                println!("Data directory: {:?}", app_data_dir);
            }

            let storage_path = app_data_dir.join("auth_data.json");

            // Initialize app state
            let state = AppState::new(storage_path, profile);
            app.manage(state);

            // Create system tray menu
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            // Build tray icon
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // Only minimize main window to tray, close others normally
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_user,
            get_token,
            get_refresh_token,
            set_auth,
            update_user,
            clear_auth,
            is_authenticated,
            get_profile,
            open_chat_window,
            request_notification_permission,
            show_notification,
            play_sound,
            open_file_dialog,
            save_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
