mod auth_preferences;
mod settings;

use crate::auth_preferences::AuthPreferencesManager;
use crate::settings::SettingsManager;
use log::error;
use std::fs;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, WebviewWindowBuilder, WindowEvent,
};

/// Global application state
pub struct AppState {
    profile: Option<String>,
}

impl AppState {
    /// Create a new AppState
    pub fn new(profile: Option<String>) -> Self {
        Self { profile }
    }

    /// Get the current profile name (for multi-instance support)
    pub fn get_profile(&self) -> Option<String> {
        self.profile.clone()
    }
}

/// Get the current profile name (for multi-instance support)
#[tauri::command]
fn get_profile(state: tauri::State<AppState>) -> Option<String> {
    state.get_profile()
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

/// Read a file from disk and return its bytes
/// Used for uploading recorded audio files
#[tauri::command]
async fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| format!("Failed to read file '{}': {}", path, e))
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

/// Set auto-launch on system startup
/// Enables or disables the application to start automatically when the computer boots
#[tauri::command]
async fn set_auto_launch(app: AppHandle, enabled: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;

    let autostart_manager = app.autolaunch();

    if enabled {
        autostart_manager
            .enable()
            .map_err(|e| format!("Failed to enable auto-launch: {}", e))?;
    } else {
        autostart_manager
            .disable()
            .map_err(|e| format!("Failed to disable auto-launch: {}", e))?;
    }

    Ok(())
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
            "chat-window.html?contactUserId={}&contactName={}",
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
        .plugin(tauri_plugin_mic_recorder::init())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
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

            let settings_storage_path = app_data_dir.join("settings.json");
            let auth_prefs_storage_path = app_data_dir.join("auth_preferences.json");

            // Initialize auth preferences manager
            let auth_prefs_manager = AuthPreferencesManager::new(auth_prefs_storage_path);
            app.manage(auth_prefs_manager);

            // Initialize settings manager
            let settings_manager = SettingsManager::new(settings_storage_path);
            app.manage(settings_manager);

            // Initialize app state
            let state = AppState::new(profile);
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
            auth_preferences::get_auth_preferences,
            auth_preferences::save_auth_preferences,
            auth_preferences::clear_auth_preferences,
            auth_preferences::get_remembered_credentials,
            settings::get_settings,
            settings::update_notification_settings,
            settings::update_startup_settings,
            settings::update_file_settings,
            settings::reset_settings,
            get_profile,
            open_chat_window,
            request_notification_permission,
            show_notification,
            play_sound,
            open_file_dialog,
            save_file,
            read_file_bytes,
            set_auto_launch
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
