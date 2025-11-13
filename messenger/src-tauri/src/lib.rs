use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

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

/// Authentication data that includes both user and token
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthData {
    pub user: AuthUser,
    pub token: String,
}

/// Global application state
pub struct AppState {
    auth_data: Mutex<Option<AuthData>>,
    storage_path: PathBuf,
}

impl AppState {
    /// Create a new AppState with storage at the given path
    pub fn new(storage_path: PathBuf) -> Self {
        let mut state = Self {
            auth_data: Mutex::new(None),
            storage_path,
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
    state.auth_data.lock().unwrap()
        .as_ref()
        .map(|data| data.user.clone())
}

/// Get the current authentication token
#[tauri::command]
fn get_token(state: tauri::State<AppState>) -> Option<String> {
    state.auth_data.lock().unwrap()
        .as_ref()
        .map(|data| data.token.clone())
}

/// Set the authentication data (user and token)
#[tauri::command]
fn set_auth(state: tauri::State<AppState>, user: AuthUser, token: String) -> Result<(), String> {
    *state.auth_data.lock().unwrap() = Some(AuthData { user, token });
    state.save_to_disk()
}

/// Update the current user's data
#[tauri::command]
fn update_user(state: tauri::State<AppState>, user_updates: AuthUser) -> Result<(), String> {
    let mut auth_data = state.auth_data.lock().unwrap();

    if let Some(data) = auth_data.as_mut() {
        data.user = user_updates;
        drop(auth_data); // Release the lock before saving
        state.save_to_disk()
    } else {
        Err("No user is currently authenticated".to_string())
    }
}

/// Clear the authentication data (sign out)
#[tauri::command]
fn clear_auth(state: tauri::State<AppState>) -> Result<(), String> {
    *state.auth_data.lock().unwrap() = None;
    state.save_to_disk()
}

/// Check if user is authenticated
#[tauri::command]
fn is_authenticated(state: tauri::State<AppState>) -> bool {
    state.auth_data.lock().unwrap().is_some()
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Get the app data directory for storage
            let app_data_dir = app.path().app_data_dir()
                .expect("Failed to get app data directory");
            let storage_path = app_data_dir.join("auth_data.json");

            // Initialize app state
            let state = AppState::new(storage_path);
            app.manage(state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_user,
            get_token,
            set_auth,
            update_user,
            clear_auth,
            is_authenticated,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
