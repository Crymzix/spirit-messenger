use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

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

/// Manages authentication state and persistence
pub struct AuthManager {
    auth_data: Mutex<Option<AuthData>>,
    storage_path: PathBuf,
}

impl AuthManager {
    /// Create a new AuthManager with storage at the given path
    pub fn new(storage_path: PathBuf) -> Self {
        let mut manager = Self {
            auth_data: Mutex::new(None),
            storage_path,
        };

        // Load auth data from disk on initialization
        if let Err(e) = manager.load_from_disk() {
            eprintln!("Failed to load auth data from disk: {}", e);
        }

        manager
    }

    /// Get the current authenticated user
    pub fn get_user(&self) -> Option<AuthUser> {
        self.auth_data
            .lock()
            .unwrap()
            .as_ref()
            .map(|data| data.user.clone())
    }

    /// Get the current authentication token
    pub fn get_token(&self) -> Option<String> {
        self.auth_data
            .lock()
            .unwrap()
            .as_ref()
            .map(|data| data.token.clone())
    }

    /// Get the current refresh token
    pub fn get_refresh_token(&self) -> Option<String> {
        self.auth_data
            .lock()
            .unwrap()
            .as_ref()
            .map(|data| data.refresh_token.clone())
    }

    /// Set the authentication data (user, access token, and refresh token)
    pub fn set_auth(&self, user: AuthUser, token: String, refresh_token: String) -> Result<(), String> {
        *self.auth_data.lock().unwrap() = Some(AuthData {
            user,
            token,
            refresh_token,
        });
        self.save_to_disk()?;
        Ok(())
    }

    /// Update the current user's data
    pub fn update_user(&self, user_updates: AuthUser) -> Result<(), String> {
        let mut auth_data = self.auth_data.lock().unwrap();

        if let Some(data) = auth_data.as_mut() {
            data.user = user_updates;
            drop(auth_data); // Release the lock before saving
            self.save_to_disk()?;
            Ok(())
        } else {
            Err("No user is currently authenticated".to_string())
        }
    }

    /// Clear the authentication data (sign out)
    pub fn clear_auth(&self) -> Result<(), String> {
        *self.auth_data.lock().unwrap() = None;
        self.save_to_disk()?;
        Ok(())
    }

    /// Check if user is authenticated
    pub fn is_authenticated(&self) -> bool {
        self.auth_data.lock().unwrap().is_some()
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
pub fn get_user(auth_manager: tauri::State<AuthManager>) -> Option<AuthUser> {
    auth_manager.get_user()
}

/// Get the current authentication token
#[tauri::command]
pub fn get_token(auth_manager: tauri::State<AuthManager>) -> Option<String> {
    auth_manager.get_token()
}

/// Get the current refresh token
#[tauri::command]
pub fn get_refresh_token(auth_manager: tauri::State<AuthManager>) -> Option<String> {
    auth_manager.get_refresh_token()
}

/// Set the authentication data (user, access token, and refresh token)
#[tauri::command]
pub fn set_auth(
    app: AppHandle,
    auth_manager: tauri::State<AuthManager>,
    user: AuthUser,
    token: String,
    refresh_token: String,
) -> Result<(), String> {
    auth_manager.set_auth(user.clone(), token, refresh_token)?;

    // Emit event to all windows
    let _ = app.emit("auth-changed", user);

    Ok(())
}

/// Update the current user's data
#[tauri::command]
pub fn update_user(
    app: AppHandle,
    auth_manager: tauri::State<AuthManager>,
    user_updates: AuthUser,
) -> Result<(), String> {
    auth_manager.update_user(user_updates.clone())?;

    // Emit event to all windows
    let _ = app.emit("auth-changed", user_updates);

    Ok(())
}

/// Clear the authentication data (sign out)
#[tauri::command]
pub fn clear_auth(app: AppHandle, auth_manager: tauri::State<AuthManager>) -> Result<(), String> {
    auth_manager.clear_auth()?;

    // Emit event to all windows to clear auth
    let _ = app.emit("auth-cleared", ());

    Ok(())
}

/// Check if user is authenticated
#[tauri::command]
pub fn is_authenticated(auth_manager: tauri::State<AuthManager>) -> bool {
    auth_manager.is_authenticated()
}
