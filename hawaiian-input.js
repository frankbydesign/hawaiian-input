/**
 * Hawaiian Language Input Library
 * ================================
 * 
 * A JavaScript library that enables Hawaiian diacritical character input
 * (macrons: ā ē ī ō ū and ʻokina) in any web browser without requiring
 * browser extensions or special permissions.
 * 
 * Developed for the KĀʻEO (Kaiapuni Assessment of Educational Outcomes)
 * program to support Hawaiian language education in Hawaiʻi's public schools.
 * 
 * @author Patrick Karjala - UH Mānoa College of Education
 * @author Frank Brockmann - Educational Technologist & Researcher
 * @version 1.2.0
 * @license MIT
 * @see https://github.com/frankbydesign/hawaiian-input
 * 
 * @example
 * // Basic usage - enable on all text fields
 * <script src="hawaiian-input.js"></script>
 * <script>HawaiianInput.install();</script>
 * 
 * @example
 * // With configuration options
 * HawaiianInput.install({
 *   deadKeyStrict: true,           // Hide dead keys while composing
 *   enableContentEditable: false,  // Disable for rich text editors
 *   ignoreSelector: '.no-hawaiian' // Skip specific elements
 * });
 * 
 * 
 * INPUT METHODS
 * =============
 * 
 * This library supports two input methods so users can type Hawaiian
 * characters however they've learned:
 * 
 * Method 1: Dead Keys
 * -------------------
 * Type a trigger key, then the character to modify.
 * 
 *   Lowercase macrons (kahakō):
 *     `a → ā    `e → ē    `i → ī    `o → ō    `u → ū
 * 
 *   Uppercase macrons:
 *     \a → Ā    \e → Ē    \i → Ī    \o → Ō    \u → Ū
 * 
 *   ʻOkina (glottal stop):
 *     `' → ʻ
 * 
 *   Escape sequences (to type literal characters):
 *     ` + space → `    \ + space → \
 * 
 * Method 2: Modifier Keys
 * -----------------------
 * Hold Ctrl or Alt/Option while typing.
 * 
 *   Ctrl+a → ā    Ctrl+A → Ā    (case preserved)
 *   Alt+e  → ē    Alt+E  → Ē
 *   Ctrl+' → ʻ    Alt+'  → ʻ
 * 
 * 
 * HOW IT WORKS
 * ============
 * 
 * The library uses a state machine to track "armed" dead keys:
 * 
 *   1. User types backtick (`) or backslash (\)
 *   2. Library enters "armed" state, waiting for next character
 *   3. If next character is a vowel or apostrophe: transform and insert
 *   4. If next character is space: insert the literal dead key
 *   5. If next character is anything else: insert both characters as-is
 *   6. Return to idle state
 * 
 * The library listens to three events:
 *   - keydown: Handles Ctrl/Alt modifier combinations
 *   - beforeinput: Primary handler for dead key sequences (modern browsers)
 *   - input: Fallback handler for browsers without beforeinput support
 * 
 * 
 * DISABLING ON SPECIFIC ELEMENTS
 * ==============================
 * 
 * Add the data-no-hawaiian attribute to any element:
 *   <input type="text" data-no-hawaiian>
 * 
 * Or use the ignoreSelector option:
 *   HawaiianInput.install({ ignoreSelector: '.password-field, #special-input' });
 * 
 * The library automatically ignores password, email, and URL input types.
 */

(function (global, factory) {
  // Universal Module Definition (UMD) pattern
  // Supports CommonJS (Node), AMD, and browser globals
  if (typeof module === "object" && typeof module.exports === "object") {
    // CommonJS/Node.js
    module.exports = factory();
  } else if (typeof define === "function" && define.amd) {
    // AMD
    define(factory);
  } else {
    // Browser global
    global.HawaiianInput = factory();
  }
})(typeof window !== "undefined" ? window : this, function () {
  "use strict";

  // ===========================================================================
  // CONSTANTS
  // ===========================================================================

  /**
   * Hawaiian vowels that can receive a macron (kahakō).
   * Stored as Sets for O(1) lookup performance.
   */
  const VOWELS_LOWER = Object.freeze(new Set(["a", "e", "i", "o", "u"]));
  const VOWELS_UPPER = Object.freeze(new Set(["A", "E", "I", "O", "U"]));
  const VOWELS_ALL = Object.freeze(new Set([...VOWELS_LOWER, ...VOWELS_UPPER]));

  /**
   * Mapping from plain vowels to vowels with macrons (kahakō).
   * The macron (¯) indicates a long vowel sound in Hawaiian.
   */
  const MACRONS = Object.freeze({
    a: "ā", e: "ē", i: "ī", o: "ō", u: "ū",
    A: "Ā", E: "Ē", I: "Ī", O: "Ō", U: "Ū"
  });

  /**
   * The ʻokina character (U+02BB: MODIFIER LETTER TURNED COMMA).
   * This is the correct Unicode character for the Hawaiian glottal stop,
   * distinct from a regular apostrophe (') or right single quote (').
   */
  const OKINA = "ʻ";

  /**
   * Dead key characters that trigger the transformation sequence.
   * DEAD_KEY (backtick) triggers lowercase macrons and ʻokina.
   * UPPER_KEY (backslash) triggers uppercase macrons.
   */
  const DEAD_KEY = "`";
  const UPPER_KEY = "\\";

  /**
   * Characters that should be interpreted as apostrophe for ʻokina.
   * Includes both straight apostrophe and curly right single quote,
   * since word processors often auto-convert straight quotes.
   */
  const APOSTROPHE_CHARS = Object.freeze(new Set(["'", "\u2019"]));

  /**
   * Default configuration options.
   * These can be overridden when calling install().
   */
  const DEFAULT_OPTIONS = Object.freeze({
    /**
     * When true, dead keys (` and \) are not displayed while the user
     * is composing a Hawaiian character. The character only appears
     * after the sequence is complete or abandoned.
     * @type {boolean}
     */
    deadKeyStrict: false,

    /**
     * Enable Hawaiian input on <input> elements.
     * Only affects text, search, and tel input types.
     * @type {boolean}
     */
    enableInputs: true,

    /**
     * Enable Hawaiian input on <textarea> elements.
     * @type {boolean}
     */
    enableTextareas: true,

    /**
     * Enable Hawaiian input on contentEditable elements.
     * Set to false if you're using a rich text editor that
     * handles its own input transformations.
     * @type {boolean}
     */
    enableContentEditable: true,

    /**
     * CSS selector for elements that should be ignored.
     * Hawaiian input will not be applied to matching elements.
     * @type {string}
     */
    ignoreSelector: 'input[type="password"], input[type="email"], input[type="url"], [data-no-hawaiian]',

    /**
     * When true, logs warnings to the console for debugging.
     * Useful during development to identify issues.
     * @type {boolean}
     */
    debug: false
  });


  // ===========================================================================
  // STATE
  // ===========================================================================

  /**
   * Current configuration (merged defaults + user options).
   * @type {Object}
   */
  let config = { ...DEFAULT_OPTIONS };

  /**
   * True when the browser's IME (Input Method Editor) is active.
   * We disable our transformations during IME composition to avoid
   * interfering with languages like Japanese or Chinese input.
   * @type {boolean}
   */
  let isComposing = false;

  /**
   * State machine flags for dead key handling.
   * 
   * When a dead key is pressed, we "arm" it and wait for the next character.
   * If deadKeyStrict is true, we also "suppress" the dead key (prevent it
   * from appearing in the input until we know what follows).
   */
  let isBacktickArmed = false;
  let isBackslashArmed = false;
  let isBacktickSuppressed = false;
  let isBackslashSuppressed = false;

  /**
   * References to event listener functions for cleanup.
   * Stored so we can properly remove them in uninstall().
   * @type {Object}
   */
  let listeners = {};


  // ===========================================================================
  // UTILITY FUNCTIONS
  // ===========================================================================

  /**
   * Logs a warning message if debug mode is enabled.
   * 
   * @param {string} message - Description of the warning
   * @param {Error} [error] - Optional error object for stack trace
   */
  function warn(message, error) {
    if (config.debug) {
      console.warn("[HawaiianInput]", message, error || "");
    }
  }

  /**
   * Resets the state machine to idle.
   * Called after a transformation completes, on focus change,
   * or when a non-matching character is typed after a dead key.
   */
  function resetState() {
    isBacktickArmed = false;
    isBackslashArmed = false;
    isBacktickSuppressed = false;
    isBackslashSuppressed = false;
  }

  /**
   * Validates and merges user options with defaults.
   * 
   * @param {Object} userOptions - Options passed to install()
   * @returns {Object} Validated and merged configuration
   */
  function validateOptions(userOptions) {
    const merged = { ...DEFAULT_OPTIONS };

    if (typeof userOptions !== "object" || userOptions === null) {
      return merged;
    }

    // Validate boolean options
    const booleanKeys = ["deadKeyStrict", "enableInputs", "enableTextareas", "enableContentEditable", "debug"];
    for (const key of booleanKeys) {
      if (key in userOptions && typeof userOptions[key] === "boolean") {
        merged[key] = userOptions[key];
      }
    }

    // Validate ignoreSelector (must be string or null/undefined)
    if ("ignoreSelector" in userOptions) {
      if (typeof userOptions.ignoreSelector === "string" || userOptions.ignoreSelector === null) {
        merged.ignoreSelector = userOptions.ignoreSelector || "";
      }
    }

    return merged;
  }


  // ===========================================================================
  // ELEMENT FILTERING
  // ===========================================================================

  /**
   * Determines if Hawaiian input should be applied to the target element.
   * 
   * Checks:
   *   1. Element exists and is a valid input type
   *   2. Element is not disabled or read-only
   *   3. Element type is enabled in config
   *   4. Element does not match ignoreSelector
   * 
   * @param {Event} event - The DOM event
   * @returns {boolean} True if the element should receive Hawaiian input
   */
  function shouldHandleElement(event) {
    const element = event.target;

    if (!element) {
      return false;
    }

    // Check standard input elements
    if (element.tagName === "INPUT") {
      if (!config.enableInputs) {
        return false;
      }

      // Only handle text-like input types
      const inputType = (element.type || "text").toLowerCase();
      const allowedTypes = ["text", "search", "tel"];
      if (!allowedTypes.includes(inputType)) {
        return false;
      }

      // Skip disabled or read-only inputs
      if (element.readOnly || element.disabled) {
        return false;
      }
    }

    // Check textarea elements
    else if (element.tagName === "TEXTAREA") {
      if (!config.enableTextareas) {
        return false;
      }

      if (element.readOnly || element.disabled) {
        return false;
      }
    }

    // Check contentEditable elements
    else if (element.isContentEditable) {
      if (!config.enableContentEditable) {
        return false;
      }
    }

    // Not an editable element
    else {
      return false;
    }

    // Check against ignore selector
    if (config.ignoreSelector) {
      try {
        if (element.matches && element.matches(config.ignoreSelector)) {
          return false;
        }
      } catch (error) {
        warn("Invalid ignoreSelector, check CSS syntax", error);
      }
    }

    return true;
  }


  // ===========================================================================
  // TEXT INSERTION
  // ===========================================================================

  /**
   * Inserts text at the current cursor position, optionally deleting
   * characters before the cursor first.
   * 
   * Handles both form fields (input/textarea) and contentEditable elements.
   * 
   * @param {HTMLElement} element - The target element
   * @param {string} text - Text to insert
   * @param {number} deleteCount - Number of characters to delete before inserting
   */
  function insertText(element, text, deleteCount) {
    if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
      insertIntoFormField(element, text, deleteCount);
    } else if (element.isContentEditable) {
      insertIntoContentEditable(element, text, deleteCount);
    }
  }

  /**
   * Inserts text into an input or textarea element.
   * Uses the standard setRangeText API for reliable cursor positioning.
   * 
   * @param {HTMLInputElement|HTMLTextAreaElement} element - The form field
   * @param {string} text - Text to insert
   * @param {number} deleteCount - Characters to delete before cursor
   */
  function insertIntoFormField(element, text, deleteCount) {
    const cursorPosition = element.selectionStart;
    const deleteStart = Math.max(0, cursorPosition - deleteCount);

    // Replace the range from deleteStart to cursor with new text
    element.setRangeText(text, deleteStart, cursorPosition, "end");

    // Dispatch input event so frameworks (React, Vue, etc.) detect the change
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }

  /**
   * Inserts text into a contentEditable element.
   * Uses the Selection and Range APIs for DOM manipulation.
   * 
   * @param {HTMLElement} element - The contentEditable element
   * @param {string} text - Text to insert
   * @param {number} deleteCount - Characters to delete before cursor
   */
  function insertIntoContentEditable(element, text, deleteCount) {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);

    // Delete characters before cursor if needed
    if (deleteCount > 0) {
      const container = range.startContainer;
      const offset = range.startOffset;

      // Only delete within current text node to avoid DOM corruption
      if (container.nodeType === Node.TEXT_NODE && offset >= deleteCount) {
        range.setStart(container, offset - deleteCount);
      }
    }

    // Delete any selected content and insert new text
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);

    // Move cursor to end of inserted text
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  /**
   * Replaces a range of characters in a form field.
   * Used by the input event fallback handler.
   * 
   * @param {HTMLInputElement|HTMLTextAreaElement} element - The form field
   * @param {number} start - Start index of range to replace
   * @param {number} end - End index of range to replace
   * @param {string} text - Replacement text
   */
  function replaceInFormField(element, start, end, text) {
    element.setRangeText(text, start, end, "end");
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }


  // ===========================================================================
  // EVENT HANDLERS
  // ===========================================================================

  /**
   * Handles keydown events for Method 2 (Ctrl/Alt + key).
   * 
   * When a modifier key is held while typing a vowel or apostrophe,
   * we intercept the keypress and insert the corresponding Hawaiian character.
   * 
   * @param {KeyboardEvent} event
   */
  function handleKeyDown(event) {
    try {
      // Skip if IME is active or element shouldn't be handled
      if (isComposing || !shouldHandleElement(event)) {
        return;
      }

      // Only process when Ctrl or Alt is held
      const hasModifier = event.ctrlKey || event.altKey;
      if (!hasModifier) {
        return;
      }

      const key = event.key;

      // Modifier + apostrophe → ʻokina
      if (APOSTROPHE_CHARS.has(key)) {
        event.preventDefault();
        insertText(event.target, OKINA, 0);
        return;
      }

      // Modifier + vowel → macron (preserves case)
      if (VOWELS_ALL.has(key)) {
        event.preventDefault();
        insertText(event.target, MACRONS[key], 0);
        return;
      }

    } catch (error) {
      warn("Error in keydown handler", error);
    }
  }

  /**
   * Handles beforeinput events for Method 1 (dead keys).
   * 
   * This is the primary handler for modern browsers. It intercepts
   * character input before it reaches the DOM, allowing us to:
   *   1. Arm dead keys when backtick or backslash is typed
   *   2. Transform sequences when a vowel/apostrophe follows a dead key
   *   3. Handle escape sequences (dead key + space)
   * 
   * @param {InputEvent} event
   */
  function handleBeforeInput(event) {
    try {
      // Skip if IME is active or element shouldn't be handled
      if (isComposing || !shouldHandleElement(event)) {
        return;
      }

      const inputData = event.data || "";
      const element = event.target;

      // Reset state on delete operations
      if (event.inputType && event.inputType.startsWith("delete")) {
        resetState();
        return;
      }

      // Only process single character insertions
      if (inputData.length !== 1) {
        return;
      }

      // ----- DEAD KEY ARMING -----

      // Backtick pressed: arm for lowercase macron or ʻokina
      if (inputData === DEAD_KEY) {
        if (config.deadKeyStrict) {
          event.preventDefault();
          isBacktickSuppressed = true;
        }
        isBacktickArmed = true;
        return;
      }

      // Backslash pressed: arm for uppercase macron
      if (inputData === UPPER_KEY) {
        if (config.deadKeyStrict) {
          event.preventDefault();
          isBackslashSuppressed = true;
        }
        isBackslashArmed = true;
        return;
      }

      // ----- BACKTICK SEQUENCES -----

      if (isBacktickArmed) {
        const deleteCount = isBacktickSuppressed ? 0 : 1;

        // Backtick + apostrophe → ʻokina
        if (APOSTROPHE_CHARS.has(inputData)) {
          event.preventDefault();
          insertText(element, OKINA, deleteCount);
          resetState();
          return;
        }

        // Backtick + lowercase vowel → lowercase macron
        if (VOWELS_LOWER.has(inputData)) {
          event.preventDefault();
          insertText(element, MACRONS[inputData], deleteCount);
          resetState();
          return;
        }

        // Backtick + space → literal backtick (escape sequence)
        if (inputData === " ") {
          event.preventDefault();
          insertText(element, DEAD_KEY, deleteCount);
          resetState();
          return;
        }

        // Backtick + other character → insert both as-is
        if (isBacktickSuppressed) {
          event.preventDefault();
          insertText(element, DEAD_KEY + inputData, 0);
        }
        resetState();
        return;
      }

      // ----- BACKSLASH SEQUENCES -----

      if (isBackslashArmed) {
        const deleteCount = isBackslashSuppressed ? 0 : 1;

        // Backslash + vowel → uppercase macron
        if (VOWELS_ALL.has(inputData)) {
          event.preventDefault();
          insertText(element, MACRONS[inputData.toUpperCase()], deleteCount);
          resetState();
          return;
        }

        // Backslash + space → literal backslash (escape sequence)
        if (inputData === " ") {
          event.preventDefault();
          insertText(element, UPPER_KEY, deleteCount);
          resetState();
          return;
        }

        // Backslash + other character → insert both as-is
        if (isBackslashSuppressed) {
          event.preventDefault();
          insertText(element, UPPER_KEY + inputData, 0);
        }
        resetState();
        return;
      }

    } catch (error) {
      warn("Error in beforeinput handler", error);
      resetState();
    }
  }

  /**
   * Handles input events as a fallback for older browsers.
   * 
   * Some browsers don't support beforeinput or don't fire it for all cases.
   * This handler examines the field content after input and performs
   * transformations retroactively by looking at the last two characters.
   * 
   * @param {InputEvent} event
   */
  function handleInput(event) {
    try {
      // Skip if IME is active or element shouldn't be handled
      if (isComposing || !shouldHandleElement(event)) {
        return;
      }

      const element = event.target;

      // Only works for form fields (contentEditable would need different logic)
      if (element.tagName !== "INPUT" && element.tagName !== "TEXTAREA") {
        return;
      }

      const value = element.value;
      const cursor = element.selectionStart;

      // Need at least 2 characters to check for a dead key sequence
      if (typeof cursor !== "number" || cursor < 2) {
        return;
      }

      const prevChar = value[cursor - 2];
      const currChar = value[cursor - 1];

      // ----- BACKTICK SEQUENCES -----

      if (prevChar === DEAD_KEY) {
        // Backtick + apostrophe → ʻokina
        if (APOSTROPHE_CHARS.has(currChar)) {
          replaceInFormField(element, cursor - 2, cursor, OKINA);
          return;
        }

        // Backtick + lowercase vowel → lowercase macron
        if (VOWELS_LOWER.has(currChar)) {
          replaceInFormField(element, cursor - 2, cursor, MACRONS[currChar]);
          return;
        }

        // Backtick + space → literal backtick
        if (currChar === " ") {
          replaceInFormField(element, cursor - 2, cursor, DEAD_KEY);
          return;
        }
      }

      // ----- BACKSLASH SEQUENCES -----

      if (prevChar === UPPER_KEY) {
        // Backslash + vowel → uppercase macron
        if (VOWELS_ALL.has(currChar)) {
          replaceInFormField(element, cursor - 2, cursor, MACRONS[currChar.toUpperCase()]);
          return;
        }

        // Backslash + space → literal backslash
        if (currChar === " ") {
          replaceInFormField(element, cursor - 2, cursor, UPPER_KEY);
          return;
        }
      }

    } catch (error) {
      warn("Error in input fallback handler", error);
      resetState();
    }
  }

  /**
   * Handles compositionstart events from the browser's IME.
   * We disable our transformations during IME composition.
   */
  function handleCompositionStart() {
    isComposing = true;
    resetState();
  }

  /**
   * Handles compositionend events from the browser's IME.
   * Re-enables our transformations after IME composition completes.
   */
  function handleCompositionEnd() {
    isComposing = false;
    resetState();
  }

  /**
   * Handles focus and click events to reset state.
   * Prevents stale armed state from affecting a new context.
   */
  function handleFocusChange() {
    resetState();
  }


  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Initializes Hawaiian input on the page.
   * 
   * Attaches event listeners to the document to intercept and transform
   * input on all eligible text fields. Call this once when your page loads.
   * 
   * @param {Object} [options] - Configuration options
   * @param {boolean} [options.deadKeyStrict=false] - Hide dead keys while composing
   * @param {boolean} [options.enableInputs=true] - Enable on input elements
   * @param {boolean} [options.enableTextareas=true] - Enable on textarea elements
   * @param {boolean} [options.enableContentEditable=true] - Enable on contentEditable
   * @param {string} [options.ignoreSelector] - CSS selector for elements to skip
   * @param {boolean} [options.debug=false] - Log warnings to console
   * 
   * @example
   * // Basic usage
   * HawaiianInput.install();
   * 
   * @example
   * // With options
   * HawaiianInput.install({
   *   deadKeyStrict: true,
   *   ignoreSelector: '.code-editor, #raw-input'
   * });
   */
  function install(options) {
    // Validate and merge options
    config = validateOptions(options);

    // Create bound listener functions (so we can remove them later)
    listeners = {
      compositionStart: handleCompositionStart,
      compositionEnd: handleCompositionEnd,
      keyDown: handleKeyDown,
      beforeInput: handleBeforeInput,
      input: handleInput,
      focusIn: handleFocusChange,
      click: handleFocusChange
    };

    // Attach event listeners (capture phase for early interception)
    document.addEventListener("compositionstart", listeners.compositionStart, true);
    document.addEventListener("compositionend", listeners.compositionEnd, true);
    document.addEventListener("keydown", listeners.keyDown, true);
    document.addEventListener("beforeinput", listeners.beforeInput, true);
    document.addEventListener("input", listeners.input, true);
    document.addEventListener("focusin", listeners.focusIn, true);
    document.addEventListener("click", listeners.click, true);

    if (config.debug) {
      console.log("[HawaiianInput] Installed with config:", config);
    }
  }

  /**
   * Removes Hawaiian input from the page.
   * 
   * Detaches all event listeners and resets state. Call this if you need
   * to completely disable Hawaiian input, such as when navigating away
   * from a page in a single-page application.
   * 
   * @example
   * // Disable Hawaiian input
   * HawaiianInput.uninstall();
   */
  function uninstall() {
    // Remove all event listeners
    if (listeners.compositionStart) {
      document.removeEventListener("compositionstart", listeners.compositionStart, true);
      document.removeEventListener("compositionend", listeners.compositionEnd, true);
      document.removeEventListener("keydown", listeners.keyDown, true);
      document.removeEventListener("beforeinput", listeners.beforeInput, true);
      document.removeEventListener("input", listeners.input, true);
      document.removeEventListener("focusin", listeners.focusIn, true);
      document.removeEventListener("click", listeners.click, true);
    }

    // Reset state
    resetState();
    isComposing = false;
    listeners = {};

    if (config.debug) {
      console.log("[HawaiianInput] Uninstalled");
    }
  }

  /**
   * Returns the current library version.
   * @type {string}
   */
  const version = "1.2.0";


  // ===========================================================================
  // EXPORT
  // ===========================================================================

  return Object.freeze({
    install,
    uninstall,
    version
  });
});
