use aes_gcm::{
    aead::{Aead, KeyInit, Payload},
    Aes256Gcm,
};
use base64::{engine::general_purpose::STANDARD, Engine};
use generic_array::GenericArray;
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

/// Represents saved authentication preferences and credentials
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthPreferences {
    pub remember_me: bool,
    pub remember_password: bool,
    pub sign_in_automatically: bool,
    pub remembered_email: Option<String>,
    pub encrypted_password: Option<String>, // Base64-encoded ciphertext with nonce
}

impl Default for AuthPreferences {
    fn default() -> Self {
        Self {
            remember_me: false,
            remember_password: false,
            sign_in_automatically: true,
            remembered_email: None,
            encrypted_password: None,
        }
    }
}

/// Manages authentication preferences with encrypted password storage
pub struct AuthPreferencesManager {
    preferences: Mutex<AuthPreferences>,
    storage_path: PathBuf,
    encryption_key_path: PathBuf,
}

impl AuthPreferencesManager {
    /// Create a new AuthPreferencesManager with storage at the given path
    pub fn new(storage_path: PathBuf) -> Self {
        // Encryption key path is in the same directory as preferences
        let encryption_key_path = storage_path.parent().map(|p| p.join(".encryption_key"));

        let manager = Self {
            preferences: Mutex::new(AuthPreferences::default()),
            storage_path,
            encryption_key_path: encryption_key_path.unwrap_or_default(),
        };

        // Load preferences from disk on initialization
        if let Err(e) = manager.load_from_disk() {
            eprintln!("Failed to load auth preferences from disk: {}", e);
        }

        manager
    }

    /// Get the current authentication preferences
    pub fn get_preferences(&self) -> AuthPreferences {
        self.preferences.lock().unwrap().clone()
    }

    /// Save preferences with optional encrypted password
    pub fn save_preferences(
        &self,
        preferences: AuthPreferences,
        password: Option<String>,
    ) -> Result<(), String> {
        let mut prefs = preferences.clone();

        // Encrypt password if provided and remember_password is true
        if let Some(pwd) = password {
            if prefs.remember_password {
                let encrypted = self.encrypt_password(&pwd)?;
                prefs.encrypted_password = Some(encrypted);
            } else {
                prefs.encrypted_password = None;
            }
        } else {
            prefs.encrypted_password = None;
        }

        *self.preferences.lock().unwrap() = prefs.clone();
        self.save_to_disk()?;
        Ok(())
    }

    /// Clear all authentication preferences
    pub fn clear_preferences(&self) -> Result<(), String> {
        *self.preferences.lock().unwrap() = AuthPreferences::default();
        self.save_to_disk()?;
        Ok(())
    }

    /// Get remembered credentials (email and decrypted password)
    pub fn get_remembered_credentials(&self) -> Result<(Option<String>, Option<String>), String> {
        let prefs = self.preferences.lock().unwrap();

        let email = prefs.remembered_email.clone();
        let password = if let Some(encrypted) = &prefs.encrypted_password {
            Some(self.decrypt_password(encrypted)?)
        } else {
            None
        };

        Ok((email, password))
    }

    /// Generate or load the encryption key
    fn get_or_create_encryption_key(&self) -> Result<[u8; 32], String> {
        if self.encryption_key_path.exists() {
            let key_data = fs::read(&self.encryption_key_path)
                .map_err(|e| format!("Failed to read encryption key: {}", e))?;

            if key_data.len() != 32 {
                return Err("Invalid encryption key size".to_string());
            }

            let mut key = [0u8; 32];
            key.copy_from_slice(&key_data);
            Ok(key)
        } else {
            // Generate a new key
            let mut rng = rand::thread_rng();
            let key: [u8; 32] = rng.gen();

            // Save the key with restricted permissions (0o600)
            fs::write(&self.encryption_key_path, &key)
                .map_err(|e| format!("Failed to write encryption key: {}", e))?;

            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let permissions = fs::Permissions::from_mode(0o600);
                fs::set_permissions(&self.encryption_key_path, permissions)
                    .map_err(|e| format!("Failed to set encryption key permissions: {}", e))?;
            }

            Ok(key)
        }
    }

    /// Encrypt a password using AES-256-GCM
    fn encrypt_password(&self, password: &str) -> Result<String, String> {
        let key = self.get_or_create_encryption_key()?;
        let cipher = Aes256Gcm::new(&key.into());

        // Generate a random nonce for each encryption
        let mut rng = rand::thread_rng();
        let nonce_bytes: [u8; 12] = rng.gen();
        let nonce = GenericArray::from_slice(&nonce_bytes);

        let password_bytes = password.as_bytes();
        let ciphertext = cipher
            .encrypt(nonce, Payload::from(password_bytes))
            .map_err(|e| format!("Encryption failed: {}", e))?;

        // Combine nonce and ciphertext, encode to base64
        // Format: base64(nonce + ciphertext)
        let mut combined = nonce_bytes.to_vec();
        combined.extend_from_slice(&ciphertext);

        Ok(STANDARD.encode(&combined))
    }

    /// Decrypt a password using AES-256-GCM
    fn decrypt_password(&self, encrypted: &str) -> Result<String, String> {
        let key = self.get_or_create_encryption_key()?;
        let cipher = Aes256Gcm::new(&key.into());

        // Decode from base64
        let combined = STANDARD
            .decode(encrypted)
            .map_err(|e| format!("Failed to decode encrypted password: {}", e))?;

        // Extract nonce and ciphertext
        if combined.len() < 12 {
            return Err("Invalid encrypted password format".to_string());
        }

        let (nonce_bytes, ciphertext) = combined.split_at(12);
        let nonce = GenericArray::from_slice(nonce_bytes);

        let plaintext = cipher
            .decrypt(nonce, Payload::from(ciphertext))
            .map_err(|e| format!("Decryption failed: {}", e))?;

        String::from_utf8(plaintext)
            .map_err(|e| format!("Invalid UTF-8 in decrypted password: {}", e))
    }

    /// Load preferences from disk
    fn load_from_disk(&self) -> Result<(), String> {
        if !self.storage_path.exists() {
            return Ok(());
        }

        let contents = fs::read_to_string(&self.storage_path)
            .map_err(|e| format!("Failed to read auth preferences file: {}", e))?;

        let preferences: AuthPreferences = serde_json::from_str(&contents)
            .map_err(|e| format!("Failed to parse auth preferences: {}", e))?;

        *self.preferences.lock().unwrap() = preferences;
        Ok(())
    }

    /// Save preferences to disk
    fn save_to_disk(&self) -> Result<(), String> {
        let preferences = self.preferences.lock().unwrap();

        let json = serde_json::to_string_pretty(&*preferences)
            .map_err(|e| format!("Failed to serialize auth preferences: {}", e))?;

        // Ensure parent directory exists
        if let Some(parent) = self.storage_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create storage directory: {}", e))?;
        }

        fs::write(&self.storage_path, json)
            .map_err(|e| format!("Failed to write auth preferences file: {}", e))?;

        // Set restrictive permissions (0o600) on the preferences file
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let permissions = fs::Permissions::from_mode(0o600);
            fs::set_permissions(&self.storage_path, permissions)
                .map_err(|e| format!("Failed to set preferences file permissions: {}", e))?;
        }

        Ok(())
    }
}

// Tauri commands for frontend access

/// Get the current authentication preferences
#[tauri::command]
pub fn get_auth_preferences(
    manager: tauri::State<AuthPreferencesManager>,
) -> Result<AuthPreferences, String> {
    Ok(manager.get_preferences())
}

/// Save authentication preferences with optional encrypted password
#[tauri::command]
pub fn save_auth_preferences(
    manager: tauri::State<AuthPreferencesManager>,
    preferences: AuthPreferences,
    password: Option<String>,
) -> Result<(), String> {
    manager.save_preferences(preferences, password)
}

/// Clear all authentication preferences
#[tauri::command]
pub fn clear_auth_preferences(manager: tauri::State<AuthPreferencesManager>) -> Result<(), String> {
    manager.clear_preferences()
}

/// Get remembered credentials (email and decrypted password)
#[tauri::command]
pub fn get_remembered_credentials(
    manager: tauri::State<AuthPreferencesManager>,
) -> Result<(Option<String>, Option<String>), String> {
    manager.get_remembered_credentials()
}
