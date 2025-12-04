import { Store } from '@tauri-apps/plugin-store';

let store: Store | null = null;
const STORE_KEY = 'ai-settings.json';
const MODEL_KEY = 'selectedModel';
const DEFAULT_MODEL = 'anthropic/claude-4.5-sonnet';

async function getStore(): Promise<Store> {
  if (!store) {
    store = await Store.load(STORE_KEY);
  }
  return store;
}

export async function loadSelectedModel(): Promise<string> {
  try {
    const appStore = await getStore();
    const model = await appStore.get<string>(MODEL_KEY);
    return model || DEFAULT_MODEL;
  } catch (error) {
    console.error('Failed to load selected model from storage:', error);
    return DEFAULT_MODEL;
  }
}

export async function saveSelectedModel(model: string): Promise<void> {
  try {
    const appStore = await getStore();
    await appStore.set(MODEL_KEY, model);
    await appStore.save();
  } catch (error) {
    console.error('Failed to save selected model to storage:', error);
  }
}
