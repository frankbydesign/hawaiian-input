# Hawaiian Language Input Library

A JavaScript library that enables Hawaiian diacritical character input (macrons and ʻokina) in any web browser without requiring extensions, plugins, or special permissions.

## Why This Matters

Hawaiian language carries identity, history, and culture in every word. When users type **Hawaiʻi** with a proper ʻokina, or **kūpuna** with the kahakō that changes its meaning, they're practicing the authentic written form of ʻŌlelo Hawaiʻi.

If you're building a website, web-based platform, or any system that captures Hawaiian text input, adding this library to your HTML ensures your users can type authentic Hawaiian diacriticals without needing to install anything or ask IT for help.

## Live Demo

Open `index.html` in any browser to try it out, or visit the hosted demo:

**[https://frankbydesign.github.io/hawaiian-input/](https://frankbydesign.github.io/hawaiian-input/)**

---

## Quick Start

**Step 1:** Download `hawaiian-input.js` and add it to your project.

**Step 2:** Add these two lines to your HTML, just before the closing `</body>` tag:

```html
<script src="hawaiian-input.js"></script>
<script>HawaiianInput.install();</script>
```

**Step 3:** That's it. Every text input and textarea on your page now supports Hawaiian character input.

---

## How to Type Hawaiian Characters

This library supports two input methods so users can type Hawaiian characters however they've learned.

### Method 1: Dead Keys

Type a trigger key, then the character to modify.

#### Lowercase Macrons (kahakō)

| Type | Result |
|------|--------|
| `` ` `` then `a` | ā |
| `` ` `` then `e` | ē |
| `` ` `` then `i` | ī |
| `` ` `` then `o` | ō |
| `` ` `` then `u` | ū |

#### Uppercase Macrons

| Type | Result |
|------|--------|
| `\` then `a` | Ā |
| `\` then `e` | Ē |
| `\` then `i` | Ī |
| `\` then `o` | Ō |
| `\` then `u` | Ū |

#### ʻOkina (glottal stop)

| Type | Result |
|------|--------|
| `` ` `` then `'` | ʻ |

#### Escape Sequences

To type the literal trigger characters:

| Type | Result |
|------|--------|
| `` ` `` then `space` | ` |
| `\` then `space` | \ |

### Method 2: Modifier Keys

Hold `Ctrl` or `Alt` (Option on Mac) while typing.

| Type | Result |
|------|--------|
| `Ctrl` + `a` | ā |
| `Ctrl` + `A` | Ā |
| `Alt` + `e` | ē |
| `Alt` + `E` | Ē |
| `Ctrl` + `'` | ʻ |

Case is preserved from your input.

---

## Configuration

You can customize the library's behavior by passing options to `install()`:

```javascript
HawaiianInput.install({
  deadKeyStrict: true,            // Hide dead keys while composing
  enableInputs: true,             // Enable on <input> elements
  enableTextareas: true,          // Enable on <textarea> elements
  enableContentEditable: false,   // Disable for rich text editors
  ignoreSelector: '.no-hawaiian', // CSS selector for elements to skip
  debug: true                     // Log warnings to console
});
```

### Option Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `deadKeyStrict` | boolean | `false` | When `true`, the backtick and backslash characters are hidden while composing a Hawaiian character. The trigger key only appears if the sequence is abandoned. |
| `enableInputs` | boolean | `true` | Enable Hawaiian input on `<input>` elements. Only affects text, search, and tel input types. |
| `enableTextareas` | boolean | `true` | Enable Hawaiian input on `<textarea>` elements. |
| `enableContentEditable` | boolean | `true` | Enable Hawaiian input on contentEditable elements. Set to `false` if using a rich text editor that handles its own transformations. |
| `ignoreSelector` | string | *(see below)* | CSS selector for elements to skip. Hawaiian input will not be applied to matching elements. |
| `debug` | boolean | `false` | When `true`, logs warnings to the browser console. Useful for troubleshooting. |

**Default ignoreSelector:**
```
input[type="password"], input[type="email"], input[type="url"], [data-no-hawaiian]
```

### Disabling on Specific Elements

Add the `data-no-hawaiian` attribute to any element:

```html
<input type="text" data-no-hawaiian placeholder="Hawaiian input disabled here">
```

Or use a custom selector:

```javascript
HawaiianInput.install({
  ignoreSelector: '.code-editor, #raw-input, [data-no-hawaiian]'
});
```

---

## API Reference

### `HawaiianInput.install([options])`

Initializes Hawaiian input on the page. Attaches event listeners to the document to intercept and transform input on all eligible text fields.

**Parameters:**
- `options` (Object, optional): Configuration options (see Configuration section)

**Example:**
```javascript
// Basic usage
HawaiianInput.install();

// With options
HawaiianInput.install({
  deadKeyStrict: true,
  ignoreSelector: '.code-editor'
});
```

### `HawaiianInput.uninstall()`

Removes Hawaiian input from the page. Detaches all event listeners and resets internal state.

**Example:**
```javascript
HawaiianInput.uninstall();
```

### `HawaiianInput.version`

Returns the library version as a string.

**Example:**
```javascript
console.log(HawaiianInput.version); // "1.2.0"
```

---

## Browser Support

Tested and working in:

- Chrome, Edge, Safari, Firefox (latest versions)
- Mobile browsers on iOS and Android
- Chromebook kiosk mode and managed environments

The library uses the `beforeinput` event for modern browsers and falls back to the `input` event for older browsers that don't support `beforeinput`.

### Known Limitations

- **Modifier keys in browsers**: Some `Ctrl`/`Alt` combinations may be intercepted by the browser or operating system before JavaScript can handle them. The dead key method (Method 1) is more reliable across all environments.
- **IME compatibility**: The library automatically disables itself during IME (Input Method Editor) composition to avoid interfering with languages like Japanese or Chinese input.
- **contentEditable**: Rich text editors may have their own input handling. Test thoroughly or disable with `enableContentEditable: false`.

---

## How It Works

The library uses a state machine to track "armed" dead keys:

1. User types backtick (`` ` ``) or backslash (`\`)
2. Library enters "armed" state, waiting for next character
3. If next character is a vowel or apostrophe: transform and insert Hawaiian character
4. If next character is space: insert the literal dead key character
5. If next character is anything else: insert both characters as-is
6. Return to idle state

The library listens to three DOM events:
- `keydown`: Handles Ctrl/Alt modifier combinations
- `beforeinput`: Primary handler for dead key sequences (modern browsers)
- `input`: Fallback handler for browsers without beforeinput support

---

## Use Cases

- **Educational platforms**: Testing systems, learning management systems, student portals
- **Government services**: Forms and applications requiring Hawaiian language support
- **Cultural organizations**: Museums, cultural centers, community websites
- **Healthcare systems**: Patient portals and medical forms
- **Research platforms**: Academic and linguistic research tools

---

## Project Structure

```
hawaiian-input/
├── index.html           # Demo page with live examples
├── hawaiian-input.js    # The library (standalone, well-documented)
├── README.md            # This file
├── LICENSE              # MIT License
├── package.json         # npm package metadata
└── .gitignore           # Git ignore rules
```

---

## Credits

**Patrick Karjala** · UH Mānoa College of Education

**Frank Brockmann** · Educational Technologist & Researcher

Developed for the KĀʻEO (Kaiapuni Assessment of Educational Outcomes) program to support Hawaiian language education in Hawaiʻi's public schools.

---

## License

[MIT License](LICENSE)

Free to use, modify, and distribute.

---

## Questions or Customization

This library supports multiple input methods so users can type Hawaiian characters however they've learned. If you have questions or need a customized implementation for your specific use case, contact:

**frank [at] centerpointcorp.com**
