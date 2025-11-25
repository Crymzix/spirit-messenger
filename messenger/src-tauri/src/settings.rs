use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

/// Application settings interface
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub notifications: NotificationSettings,
    pub startup: StartupSettings,
    pub files: FileSettings,
}

/// Notification settings
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationSettings {
    pub enabled: bool,
    pub sound_enabled: bool,
    pub sound_volume: u8, // 0-100
    pub desktop_alerts: bool,
}

/// Startup settings
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartupSettings {
    pub auto_launch: bool,
    pub start_minimized: bool,
}

/// File settings
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileSettings {
    pub download_location: String,
    pub auto_accept_from: Vec<String>, // User IDs to auto-accept files from
}

/// Default settings values
fn default_settings() -> AppSettings {
    AppSettings {
        notifications: NotificationSettings {
            enabled: true,
            sound_enabled: true,
            sound_volume: 80,
            desktop_alerts: true,
        },
        startup: StartupSettings {
            auto_launch: false,
            start_minimized: false,
        },
        files: FileSettings {
            download_location: String::new(),
            auto_accept_from: Vec::new(),
        },
    }
}

/// Manages application settings and persistence
pub struct SettingsManager {
    settings: Mutex<AppSettings>,
    storage_path: PathBuf,
}

impl SettingsManager {
    /// Create a new SettingsManager with storage at the given path
    pub fn new(storage_path: PathBuf) -> Self {
        let mut manager = Self {
            settings: Mutex::new(default_settings()),
            storage_path,
        };

        // Load settings from disk on initialization
        if let Err(e) = manager.load_from_disk() {
            eprintln!("Failed to load settings from disk: {}", e);
        }

        manager
    }

    /// Get all settings
    pub fn get_settings(&self) -> AppSettings {
        self.settings.lock().unwrap().clone()
    }

    /// Update notification settings
    pub fn update_notification_settings(&self, updates: NotificationSettings) -> Result<(), String> {
        let mut settings = self.settings.lock().unwrap();
        settings.notifications = updates;
        drop(settings);
        self.save_to_disk()?;
        Ok(())
    }

    /// Update startup settings
    pub fn update_startup_settings(&self, updates: StartupSettings) -> Result<(), String> {
        let mut settings = self.settings.lock().unwrap();
        settings.startup = updates;
        drop(settings);
        self.save_to_disk()?;
        Ok(())
    }

    /// Update file settings
    pub fn update_file_settings(&self, updates: FileSettings) -> Result<(), String> {
        let mut settings = self.settings.lock().unwrap();
        settings.files = updates;
        drop(settings);
        self.save_to_disk()?;
        Ok(())
    }

    /// Reset all settings to defaults
    pub fn reset_settings(&self) -> Result<(), String> {
        *self.settings.lock().unwrap() = default_settings();
        self.save_to_disk()?;
        Ok(())
    }

    /// Load settings from disk
    fn load_from_disk(&mut self) -> Result<(), String> {
        if !self.storage_path.exists() {
            return Ok(());
        }

        let contents = fs::read_to_string(&self.storage_path)
            .map_err(|e| format!("Failed to read settings file: {}", e))?;

        let settings: AppSettings = serde_json::from_str(&contents)
            .map_err(|e| format!("Failed to parse settings: {}", e))?;

        *self.settings.lock().unwrap() = settings;

        Ok(())
    }

    /// Save settings to disk
    fn save_to_disk(&self) -> Result<(), String> {
        let settings = self.settings.lock().unwrap();

        let json = serde_json::to_string_pretty(&*settings)
            .map_err(|e| format!("Failed to serialize settings: {}", e))?;

        // Ensure parent directory exists
        if let Some(parent) = self.storage_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create storage directory: {}", e))?;
        }

        fs::write(&self.storage_path, json)
            .map_err(|e| format!("Failed to write settings file: {}", e))?;

        Ok(())
    }
}

/// Get all settings
#[tauri::command]
pub fn get_settings(settings_manager: tauri::State<SettingsManager>) -> AppSettings {
    settings_manager.get_settings()
}

/// Update notification settings
#[tauri::command]
pub fn update_notification_settings(
    app: AppHandle,
    settings_manager: tauri::State<SettingsManager>,
    notifications: NotificationSettings,
) -> Result<(), String> {
    settings_manager.update_notification_settings(notifications.clone())?;

    // Emit event to all windows
    let _ = app.emit("settings-changed", notifications);

    Ok(())
}

/// Update startup settings
#[tauri::command]
pub fn update_startup_settings(
    app: AppHandle,
    settings_manager: tauri::State<SettingsManager>,
    startup: StartupSettings,
) -> Result<(), String> {
    settings_manager.update_startup_settings(startup.clone())?;

    // Emit event to all windows
    let _ = app.emit("settings-changed", startup);

    Ok(())
}

/// Update file settings
#[tauri::command]
pub fn update_file_settings(
    app: AppHandle,
    settings_manager: tauri::State<SettingsManager>,
    files: FileSettings,
) -> Result<(), String> {
    settings_manager.update_file_settings(files.clone())?;

    // Emit event to all windows
    let _ = app.emit("settings-changed", files);

    Ok(())
}

/// Reset settings to defaults
#[tauri::command]
pub fn reset_settings(
    app: AppHandle,
    settings_manager: tauri::State<SettingsManager>,
) -> Result<(), String> {
    settings_manager.reset_settings()?;

    let settings = settings_manager.get_settings();

    // Emit event to all windows
    let _ = app.emit("settings-reset", settings);

    Ok(())
}
