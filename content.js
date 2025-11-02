// Browser API polyfill for Chrome/Firefox compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Utility: Generate unique CSS selector for an element
function generateSelector(element) {
  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }

  const path = [];
  let current = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(c => c);
      if (classes.length > 0) {
        selector += '.' + classes.map(c => CSS.escape(c)).join('.');
      }
    }

    // Add nth-child if needed for uniqueness
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        child => child.tagName === current.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);
    current = parent;
  }

  return path.join(' > ');
}

// Content script for element hiding functionality
class ElementHider {
  constructor() {
    this.isActive = false;
    this.history = []; // Stack for undo/redo
    this.historyIndex = -1; // Current position in history
    this.hiddenElements = new Set(); // Currently hidden elements
    this.originalDisplayStyles = new Map(); // Store original display styles
    this.persistedSelectors = new Set(); // Selectors saved to storage
    this.fabContainer = null;
    this.clickHandler = null;
    this.hoverHandler = null;
    this.hoverOutHandler = null;
    this.hoveredElement = null;

    // Load and apply persisted rules on initialization
    this.loadAndApplyRules();
  }

  // Get current domain for storage key
  getDomain() {
    return window.location.hostname;
  }

  // Get storage key for current domain
  getStorageKey() {
    return `hiddenElements_${this.getDomain()}`;
  }

  // Load persisted rules and apply them
  async loadAndApplyRules() {
    const storageKey = this.getStorageKey();

    try {
      const result = await browserAPI.storage.local.get(storageKey);
      const selectors = result[storageKey] || [];

      if (selectors.length > 0) {
        // Apply each selector
        selectors.forEach(selector => {
          try {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
              if (element && window.getComputedStyle(element).display !== 'none') {
                element.style.display = 'none';
                this.persistedSelectors.add(selector);
              }
            });
          } catch (e) {
            console.warn('Failed to apply selector:', selector, e);
          }
        });
      }
    } catch (error) {
      console.error('Error loading hidden elements:', error);
    }
  }

  // Save current hidden elements to storage
  async saveRulesToStorage() {
    const storageKey = this.getStorageKey();

    // Generate selectors for all currently hidden elements
    const selectors = [];
    this.hiddenElements.forEach(element => {
      try {
        const selector = generateSelector(element);
        selectors.push(selector);
        this.persistedSelectors.add(selector);
      } catch (e) {
        console.warn('Failed to generate selector for element:', element, e);
      }
    });

    // Load existing rules and merge
    try {
      const result = await browserAPI.storage.local.get(storageKey);
      const existingSelectors = result[storageKey] || [];
      const mergedSelectors = [...new Set([...existingSelectors, ...selectors])];

      await browserAPI.storage.local.set({ [storageKey]: mergedSelectors });
      return mergedSelectors.length;
    } catch (error) {
      console.error('Error saving hidden elements:', error);
      throw error;
    }
  }

  // Reset all rules for current domain
  async resetAllRules() {
    const storageKey = this.getStorageKey();

    try {
      // Get all selectors for this domain
      const result = await browserAPI.storage.local.get(storageKey);
      const selectors = result[storageKey] || [];

      // Restore all elements matched by stored selectors
      selectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            if (element) {
              element.style.display = '';
            }
          });
        } catch (e) {
          console.warn('Failed to restore selector:', selector, e);
        }
      });

      // Also restore current session elements
      this.hiddenElements.forEach(element => {
        const originalDisplay = this.originalDisplayStyles.get(element) || '';
        element.style.display = originalDisplay;
      });

      // Clear storage
      await browserAPI.storage.local.remove(storageKey);

      // Clear local state
      this.hiddenElements.clear();
      this.originalDisplayStyles.clear();
      this.persistedSelectors.clear();
      this.history = [];
      this.historyIndex = -1;

      this.showNotification('All hiding rules reset for this domain!');
    } catch (error) {
      console.error('Error resetting rules:', error);
      this.showNotification('Error resetting rules. Check console.');
    }
  }

  toggle() {
    if (this.isActive) {
      this.deactivate();
    } else {
      this.activate();
    }
  }

  activate() {
    this.isActive = true;
    this.createFABUI();
    this.attachEventListeners();
    document.body.style.cursor = 'crosshair';
  }

  deactivate() {
    this.isActive = false;
    this.removeFABUI();
    this.removeEventListeners();
    document.body.style.cursor = '';
    if (this.hoveredElement) {
      this.hoveredElement.style.outline = '';
      this.hoveredElement = null;
    }
  }

  createFABUI() {
    if (this.fabContainer) return;

    this.fabContainer = document.createElement('div');
    this.fabContainer.id = 'element-hider-fab-container';
    this.fabContainer.innerHTML = `
      <div class="fab-button" id="fab-undo" title="Undo (Ctrl+Z)">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 7v6h6"></path>
          <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"></path>
        </svg>
      </div>
      <div class="fab-button" id="fab-redo" title="Redo (Ctrl+Y)">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 7v6h-6"></path>
          <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7"></path>
        </svg>
      </div>
      <div class="fab-button fab-reset" id="fab-reset" title="Reset All Hidden Elements">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
          <path d="M3 3v5h5"></path>
        </svg>
      </div>
      <div class="fab-button fab-accept" id="fab-accept" title="Accept & Save Changes">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <div class="fab-button fab-cancel" id="fab-cancel" title="Cancel Session Changes">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </div>
    `;

    document.body.appendChild(this.fabContainer);

    // Attach button event listeners
    document.getElementById('fab-undo').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.undo();
    });

    document.getElementById('fab-redo').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.redo();
    });

    document.getElementById('fab-reset').addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await this.resetAllRules();
      this.deactivate();
    });

    document.getElementById('fab-accept').addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await this.accept();
    });

    document.getElementById('fab-cancel').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.cancel();
    });

    this.updateFABState();
  }

  removeFABUI() {
    if (this.fabContainer) {
      this.fabContainer.remove();
      this.fabContainer = null;
    }
  }

  attachEventListeners() {
    // Click handler to hide elements
    this.clickHandler = (e) => {
      const target = e.target;

      // Don't hide FAB buttons or the container
      if (target.closest('#element-hider-fab-container')) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      this.hideElement(target);
    };

    // Hover handler to highlight elements
    this.hoverHandler = (e) => {
      const target = e.target;

      // Don't highlight FAB buttons
      if (target.closest('#element-hider-fab-container')) {
        return;
      }

      if (this.hoveredElement && this.hoveredElement !== target) {
        this.hoveredElement.style.outline = '';
      }

      this.hoveredElement = target;
      target.style.outline = '2px solid #ff0000';
    };

    this.hoverOutHandler = (e) => {
      const target = e.target;
      if (target === this.hoveredElement) {
        target.style.outline = '';
        this.hoveredElement = null;
      }
    };

    document.addEventListener('click', this.clickHandler, true);
    document.addEventListener('mouseover', this.hoverHandler, true);
    document.addEventListener('mouseout', this.hoverOutHandler, true);

    // Keyboard shortcuts
    this.keyboardHandler = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          this.undo();
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          this.redo();
        }
      }
    };

    document.addEventListener('keydown', this.keyboardHandler, true);
  }

  removeEventListeners() {
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler, true);
      this.clickHandler = null;
    }
    if (this.hoverHandler) {
      document.removeEventListener('mouseover', this.hoverHandler, true);
      this.hoverHandler = null;
    }
    if (this.hoverOutHandler) {
      document.removeEventListener('mouseout', this.hoverOutHandler, true);
      this.hoverOutHandler = null;
    }
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler, true);
      this.keyboardHandler = null;
    }
  }

  hideElement(element) {
    // Store original display style
    const computedStyle = window.getComputedStyle(element);
    const originalDisplay = computedStyle.display;

    if (originalDisplay === 'none') {
      return; // Already hidden
    }

    this.originalDisplayStyles.set(element, originalDisplay);
    element.style.display = 'none';
    this.hiddenElements.add(element);

    // Remove hover outline if this was the hovered element
    if (this.hoveredElement === element) {
      this.hoveredElement = null;
    }

    // Add to history (remove any redo history after current index)
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push({
      action: 'hide',
      element: element,
      originalDisplay: originalDisplay
    });
    this.historyIndex++;

    this.updateFABState();
  }

  showElement(element) {
    const originalDisplay = this.originalDisplayStyles.get(element) || '';
    element.style.display = originalDisplay;
    this.hiddenElements.delete(element);
    this.originalDisplayStyles.delete(element);
  }

  undo() {
    if (this.historyIndex < 0) return;

    const historyItem = this.history[this.historyIndex];

    if (historyItem.action === 'hide') {
      // Restore original display from history (not from map)
      historyItem.element.style.display = historyItem.originalDisplay;
      this.hiddenElements.delete(historyItem.element);
      this.originalDisplayStyles.delete(historyItem.element);
    }

    this.historyIndex--;
    this.updateFABState();
  }

  redo() {
    if (this.historyIndex >= this.history.length - 1) return;

    this.historyIndex++;
    const historyItem = this.history[this.historyIndex];

    if (historyItem.action === 'hide') {
      // Restore the originalDisplay map entry for future undos
      this.originalDisplayStyles.set(historyItem.element, historyItem.originalDisplay);
      historyItem.element.style.display = 'none';
      this.hiddenElements.add(historyItem.element);
    }

    this.updateFABState();
  }

  async accept() {
    // Save changes to storage for persistence
    if (this.hiddenElements.size > 0) {
      try {
        const count = await this.saveRulesToStorage();
        this.history = [];
        this.historyIndex = -1;
        this.deactivate();

        // Show confirmation
        this.showNotification(`Changes saved! ${count} rule(s) will persist across pages.`);
      } catch (error) {
        this.showNotification('Error saving changes. Check console.');
        console.error('Failed to save changes:', error);
      }
    } else {
      this.history = [];
      this.historyIndex = -1;
      this.deactivate();
      this.showNotification('No changes to save.');
    }
  }

  cancel() {
    // Restore all hidden elements
    this.hiddenElements.forEach(element => {
      const originalDisplay = this.originalDisplayStyles.get(element) || '';
      element.style.display = originalDisplay;
    });

    this.hiddenElements.clear();
    this.originalDisplayStyles.clear();
    this.history = [];
    this.historyIndex = -1;

    this.deactivate();
    this.showNotification('All changes cancelled. Elements restored.');
  }

  updateFABState() {
    if (!this.fabContainer) return;

    const undoButton = document.getElementById('fab-undo');
    const redoButton = document.getElementById('fab-redo');

    // Enable/disable undo button
    if (this.historyIndex >= 0) {
      undoButton.classList.remove('disabled');
    } else {
      undoButton.classList.add('disabled');
    }

    // Enable/disable redo button
    if (this.historyIndex < this.history.length - 1) {
      redoButton.classList.remove('disabled');
    } else {
      redoButton.classList.add('disabled');
    }
  }

  showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'element-hider-notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Initialize the element hider
const elementHider = new ElementHider();

// Listen for messages from background script
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggle') {
    elementHider.toggle();
    sendResponse({ success: true });
  }
  return true;
});
