/**
 * Emoticon system for MSN Messenger Clone
 * Maps emoticon shortcuts to their corresponding image files
 */

export interface Emoticon {
    id: string;
    name: string;
    shortcuts: string[];
    imageUrl: string;
    category: 'smile' | 'object' | 'symbol' | 'other';
}

/**
 * Complete list of available emoticons with their shortcuts and image URLs
 */
export const emoticons: Emoticon[] = [
    // Smile emoticons
    {
        id: 'regular_smile',
        name: 'Smile',
        shortcuts: [':)', ':-)'],
        imageUrl: '/emoticons/regular_smile.gif',
        category: 'smile',
    },
    {
        id: 'sad_smile',
        name: 'Sad',
        shortcuts: [':(', ':-('],
        imageUrl: '/emoticons/sad_smile.gif',
        category: 'smile',
    },
    {
        id: 'wink_smile',
        name: 'Wink',
        shortcuts: [';)', ';-)'],
        imageUrl: '/emoticons/wink_smile.gif',
        category: 'smile',
    },
    {
        id: 'tongue_smile',
        name: 'Tongue',
        shortcuts: [':P', ':-P', ':p', ':-p'],
        imageUrl: '/emoticons/tongue_smile.gif',
        category: 'smile',
    },
    {
        id: 'teeth_smile',
        name: 'Big Grin',
        shortcuts: [':D', ':-D', ':d', ':-d'],
        imageUrl: '/emoticons/teeth_smile.gif',
        category: 'smile',
    },
    {
        id: 'confused_smile',
        name: 'Confused',
        shortcuts: [':S', ':-S', ':s', ':-s'],
        imageUrl: '/emoticons/confused_smile.gif',
        category: 'smile',
    },
    {
        id: 'cry_smile',
        name: 'Crying',
        shortcuts: [':\'(', ':\'-('],
        imageUrl: '/emoticons/cry_smile.gif',
        category: 'smile',
    },
    {
        id: 'angry_smile',
        name: 'Angry',
        shortcuts: [':@', ':-@'],
        imageUrl: '/emoticons/angry_smile.gif',
        category: 'smile',
    },
    {
        id: 'angel_smile',
        name: 'Angel',
        shortcuts: ['(A)', '(a)'],
        imageUrl: '/emoticons/angel_smile.gif',
        category: 'smile',
    },
    {
        id: 'devil_smile',
        name: 'Devil',
        shortcuts: ['(6)'],
        imageUrl: '/emoticons/devil_smile.gif',
        category: 'smile',
    },
    {
        id: 'red_smile',
        name: 'Embarrassed',
        shortcuts: [':$', ':-$'],
        imageUrl: '/emoticons/red_smile.gif',
        category: 'smile',
    },
    {
        id: 'shades_smile',
        name: 'Cool',
        shortcuts: ['(H)', '(h)', '8-)'],
        imageUrl: '/emoticons/shades_smile.gif',
        category: 'smile',
    },
    {
        id: 'omg_smile',
        name: 'Surprised',
        shortcuts: [':O', ':-O', ':o', ':-o'],
        imageUrl: '/emoticons/omg_smile.gif',
        category: 'smile',
    },
    {
        id: 'what_smile',
        name: 'Wondering',
        shortcuts: [':|', ':-|'],
        imageUrl: '/emoticons/what_smile.gif',
        category: 'smile',
    },
    {
        id: 'kiss',
        name: 'Kiss',
        shortcuts: [':*', ':-*', '(K)', '(k)'],
        imageUrl: '/emoticons/kiss.gif',
        category: 'smile',
    },
    {
        id: 'baring_teeth_smile',
        name: 'Baring Teeth',
        shortcuts: ['8o|', '8-o|'],
        imageUrl: '/emoticons/baring_teeth_smile.gif',
        category: 'smile',
    },
    {
        id: 'eye_rolling_smile',
        name: 'Eye Rolling',
        shortcuts: ['8-)', '8)'],
        imageUrl: '/emoticons/eye_rolling_smile.gif',
        category: 'smile',
    },
    {
        id: 'idk_smile',
        name: 'I Don\'t Know',
        shortcuts: [':^)'],
        imageUrl: '/emoticons/idk_smile.gif',
        category: 'smile',
    },
    {
        id: 'nerd_smile',
        name: 'Nerd',
        shortcuts: ['8-|', '8|', 'B-|', 'B|'],
        imageUrl: '/emoticons/nerd_smile.gif',
        category: 'smile',
    },
    {
        id: 'party_smile',
        name: 'Party',
        shortcuts: ['<O)', '<o)'],
        imageUrl: '/emoticons/party_smile.gif',
        category: 'smile',
    },
    {
        id: 'sarcastic_smile',
        name: 'Sarcastic',
        shortcuts: ['^o)', '^O)'],
        imageUrl: '/emoticons/sarcastic_smile.gif',
        category: 'smile',
    },
    {
        id: 'secret_telling_smile',
        name: 'Secret Telling',
        shortcuts: [':-#', ':#'],
        imageUrl: '/emoticons/secret_telling_smile.gif',
        category: 'smile',
    },
    {
        id: 'sick_smile',
        name: 'Sick',
        shortcuts: ['+o(', '+O('],
        imageUrl: '/emoticons/sick_smile.gif',
        category: 'smile',
    },
    {
        id: 'sleepy_smile',
        name: 'Sleepy',
        shortcuts: ['|-)', 'I-)', 'I)', '|-)'],
        imageUrl: '/emoticons/sleepy_smile.gif',
        category: 'smile',
    },
    {
        id: 'thinking_smile',
        name: 'Thinking',
        shortcuts: ['*-)', '*)', ':-?', ':?'],
        imageUrl: '/emoticons/thinking_smile.gif',
        category: 'smile',
    },
    {
        id: 'zip_smile',
        name: 'Zipped Lips',
        shortcuts: [':-X', ':X', ':-x', ':x'],
        imageUrl: '/emoticons/zip_smile.gif',
        category: 'smile',
    },

    // Object emoticons
    {
        id: 'heart',
        name: 'Heart',
        shortcuts: ['(L)', '(l)', '<3'],
        imageUrl: '/emoticons/heart.gif',
        category: 'object',
    },
    {
        id: 'broken_heart',
        name: 'Broken Heart',
        shortcuts: ['(U)', '(u)'],
        imageUrl: '/emoticons/broken_heart.gif',
        category: 'object',
    },
    {
        id: 'rose',
        name: 'Rose',
        shortcuts: ['(F)', '(f)'],
        imageUrl: '/emoticons/rose.gif',
        category: 'object',
    },
    {
        id: 'wilted_rose',
        name: 'Wilted Rose',
        shortcuts: ['(W)', '(w)'],
        imageUrl: '/emoticons/wilted_rose.gif',
        category: 'object',
    },
    {
        id: 'cake',
        name: 'Cake',
        shortcuts: ['(^)'],
        imageUrl: '/emoticons/cake.gif',
        category: 'object',
    },
    {
        id: 'present',
        name: 'Present',
        shortcuts: ['(G)', '(g)'],
        imageUrl: '/emoticons/present.gif',
        category: 'object',
    },
    {
        id: 'beer_mug',
        name: 'Beer',
        shortcuts: ['(B)', '(b)'],
        imageUrl: '/emoticons/beer_mug.gif',
        category: 'object',
    },
    {
        id: 'martini',
        name: 'Martini',
        shortcuts: ['(D)', '(d)'],
        imageUrl: '/emoticons/martini.gif',
        category: 'object',
    },
    {
        id: 'coffee',
        name: 'Coffee',
        shortcuts: ['(C)', '(c)'],
        imageUrl: '/emoticons/coffee.gif',
        category: 'object',
    },
    {
        id: 'phone',
        name: 'Phone',
        shortcuts: ['(T)', '(t)'],
        imageUrl: '/emoticons/phone.gif',
        category: 'object',
    },
    {
        id: 'camera',
        name: 'Camera',
        shortcuts: ['(P)', '(p)'],
        imageUrl: '/emoticons/camera.gif',
        category: 'object',
    },
    {
        id: 'film',
        name: 'Film',
        shortcuts: ['(~)'],
        imageUrl: '/emoticons/film.gif',
        category: 'object',
    },
    {
        id: 'note',
        name: 'Music Note',
        shortcuts: ['(8)'],
        imageUrl: '/emoticons/note.gif',
        category: 'object',
    },
    {
        id: 'envelope',
        name: 'Email',
        shortcuts: ['(E)', '(e)'],
        imageUrl: '/emoticons/envelope.gif',
        category: 'object',
    },
    {
        id: 'clock',
        name: 'Clock',
        shortcuts: ['(O)', '(o)'],
        imageUrl: '/emoticons/clock.gif',
        category: 'object',
    },
    {
        id: 'lightbulb',
        name: 'Light Bulb',
        shortcuts: ['(I)', '(i)'],
        imageUrl: '/emoticons/lightbulb.gif',
        category: 'object',
    },
    {
        id: 'airplane',
        name: 'Airplane',
        shortcuts: ['(AP)', '(ap)'],
        imageUrl: '/emoticons/airplane.gif',
        category: 'object',
    },
    {
        id: 'bowl',
        name: 'Bowl',
        shortcuts: ['(||)'],
        imageUrl: '/emoticons/bowl.gif',
        category: 'object',
    },
    {
        id: 'car',
        name: 'Car',
        shortcuts: ['(AU)', '(au)'],
        imageUrl: '/emoticons/car.gif',
        category: 'object',
    },
    {
        id: 'computer',
        name: 'Computer',
        shortcuts: ['(CO)', '(co)'],
        imageUrl: '/emoticons/computer.gif',
        category: 'object',
    },
    {
        id: 'island',
        name: 'Island',
        shortcuts: ['(IP)', '(ip)'],
        imageUrl: '/emoticons/island.gif',
        category: 'object',
    },
    {
        id: 'mobile_phone',
        name: 'Mobile Phone',
        shortcuts: ['(MP)', '(mp)'],
        imageUrl: '/emoticons/mobile_phone.gif',
        category: 'object',
    },
    {
        id: 'money',
        name: 'Money',
        shortcuts: ['(MO)', '(mo)'],
        imageUrl: '/emoticons/money.gif',
        category: 'object',
    },
    {
        id: 'pizza',
        name: 'Pizza',
        shortcuts: ['(PI)', '(pi)'],
        imageUrl: '/emoticons/pizza.gif',
        category: 'object',
    },
    {
        id: 'plate',
        name: 'Plate',
        shortcuts: ['(PL)', '(pl)'],
        imageUrl: '/emoticons/plate.gif',
        category: 'object',
    },
    {
        id: 'soccer',
        name: 'Soccer Ball',
        shortcuts: ['(SO)', '(so)'],
        imageUrl: '/emoticons/soccer.gif',
        category: 'object',
    },
    {
        id: 'umbrella',
        name: 'Umbrella',
        shortcuts: ['(UM)', '(um)'],
        imageUrl: '/emoticons/umbrella.gif',
        category: 'object',
    },

    // Symbol emoticons
    {
        id: 'star',
        name: 'Star',
        shortcuts: ['(*)'],
        imageUrl: '/emoticons/star.gif',
        category: 'symbol',
    },
    {
        id: 'moon',
        name: 'Moon',
        shortcuts: ['(S)', '(s)'],
        imageUrl: '/emoticons/moon.gif',
        category: 'symbol',
    },
    {
        id: 'thumbs_up',
        name: 'Thumbs Up',
        shortcuts: ['(Y)', '(y)'],
        imageUrl: '/emoticons/thumbs_up.gif',
        category: 'symbol',
    },
    {
        id: 'thumbs_down',
        name: 'Thumbs Down',
        shortcuts: ['(N)', '(n)'],
        imageUrl: '/emoticons/thumbs_down.gif',
        category: 'symbol',
    },
    {
        id: 'lightning',
        name: 'Lightning',
        shortcuts: ['(LI)', '(li)'],
        imageUrl: '/emoticons/lightning.gif',
        category: 'symbol',
    },
    {
        id: 'stormy',
        name: 'Stormy',
        shortcuts: ['(ST)', '(st)'],
        imageUrl: '/emoticons/stormy.gif',
        category: 'symbol',
    },

    // Other emoticons
    {
        id: 'cat',
        name: 'Cat',
        shortcuts: ['(@)'],
        imageUrl: '/emoticons/cat.gif',
        category: 'other',
    },
    {
        id: 'dog',
        name: 'Dog',
        shortcuts: ['(&)'],
        imageUrl: '/emoticons/dog.gif',
        category: 'other',
    },
    {
        id: 'bat',
        name: 'Bat',
        shortcuts: ['(%)'],
        imageUrl: '/emoticons/bat.gif',
        category: 'other',
    },
    {
        id: 'guy',
        name: 'Guy',
        shortcuts: ['(Z)', '(z)'],
        imageUrl: '/emoticons/guy.gif',
        category: 'other',
    },
    {
        id: 'girl',
        name: 'Girl',
        shortcuts: ['(X)', '(x)'],
        imageUrl: '/emoticons/girl.gif',
        category: 'other',
    },
    {
        id: 'guy_hug',
        name: 'Guy Hug',
        shortcuts: ['({)'],
        imageUrl: '/emoticons/guy_hug.gif',
        category: 'other',
    },
    {
        id: 'girl_hug',
        name: 'Girl Hug',
        shortcuts: ['(})'],
        imageUrl: '/emoticons/girl_hug.gif',
        category: 'other',
    },
    {
        id: 'messenger',
        name: 'MSN Messenger',
        shortcuts: ['(M)', '(m)'],
        imageUrl: '/emoticons/messenger.gif',
        category: 'other',
    },
    {
        id: 'black_sheep',
        name: 'Black Sheep',
        shortcuts: ['(BAH)', '(bah)'],
        imageUrl: '/emoticons/black_sheep.gif',
        category: 'other',
    },
    {
        id: 'snail',
        name: 'Snail',
        shortcuts: ['(SN)', '(sn)'],
        imageUrl: '/emoticons/snail.gif',
        category: 'other',
    },
];

/**
 * Map of shortcuts to emoticon IDs for quick lookup
 * Sorted by length (longest first) to match longer shortcuts before shorter ones
 */
export const emoticonShortcutMap = new Map<string, string>();

// Build the shortcut map
emoticons.forEach((emoticon) => {
    emoticon.shortcuts.forEach((shortcut) => {
        emoticonShortcutMap.set(shortcut, emoticon.id);
    });
});

/**
 * Get all shortcuts sorted by length (longest first)
 * This ensures longer shortcuts like ':-(' are matched before shorter ones like ':('
 */
export const sortedShortcuts = Array.from(emoticonShortcutMap.keys()).sort(
    (a, b) => b.length - a.length
);

/**
 * Find an emoticon by its ID
 */
export function getEmoticonById(id: string): Emoticon | undefined {
    return emoticons.find((emoticon) => emoticon.id === id);
}

/**
 * Find an emoticon by a shortcut
 */
export function getEmoticonByShortcut(shortcut: string): Emoticon | undefined {
    const id = emoticonShortcutMap.get(shortcut);
    return id ? getEmoticonById(id) : undefined;
}

/**
 * Get emoticons by category
 */
export function getEmoticonsByCategory(
    category: Emoticon['category']
): Emoticon[] {
    return emoticons.filter((emoticon) => emoticon.category === category);
}

/**
 * Search emoticons by name
 */
export function searchEmoticons(query: string): Emoticon[] {
    const lowerQuery = query.toLowerCase();
    return emoticons.filter((emoticon) =>
        emoticon.name.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Parse text and find all emoticon shortcuts
 * Returns an array of matches with position and emoticon info
 */
export interface EmoticonMatch {
    shortcut: string;
    emoticon: Emoticon;
    startIndex: number;
    endIndex: number;
}

export function findEmoticonMatches(text: string): EmoticonMatch[] {
    const matches: EmoticonMatch[] = [];

    // Try to match each shortcut in the text
    for (const shortcut of sortedShortcuts) {
        let index = 0;
        while ((index = text.indexOf(shortcut, index)) !== -1) {
            const emoticon = getEmoticonByShortcut(shortcut);
            if (emoticon) {
                matches.push({
                    shortcut,
                    emoticon,
                    startIndex: index,
                    endIndex: index + shortcut.length,
                });
            }
            index += shortcut.length;
        }
    }

    // Sort matches by position
    return matches.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Replace emoticon shortcuts in text with a placeholder or custom replacement
 */
export function replaceEmoticons(
    text: string,
    replacer: (emoticon: Emoticon, shortcut: string) => string
): string {
    let result = text;
    const matches = findEmoticonMatches(text);

    // Process matches in reverse order to maintain correct indices
    for (let i = matches.length - 1; i >= 0; i--) {
        const match = matches[i];
        const replacement = replacer(match.emoticon, match.shortcut);
        result =
            result.slice(0, match.startIndex) +
            replacement +
            result.slice(match.endIndex);
    }

    return result;
}
