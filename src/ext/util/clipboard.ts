/**
 * Clipboard utility
 *
 * Modernized: Uses navigator.clipboard API with execCommand fallback.
 * iOS12-COMPAT: execCommand('copy') fallback — remove when iOS >= 15 is the floor
 */
export default async function clipboard(text: string, successCallback: () => void, errorCallback: (e: unknown) => void): Promise<void> {
  // Modern Clipboard API (Safari 13.1+, all other target browsers)
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      successCallback();
    } catch (e) {
      // Fall back to legacy method
      legacyCopy(text, successCallback, errorCallback);
    }
    return;
  }

  // iOS12-COMPAT: Legacy fallback using execCommand — remove when iOS >= 15 is the floor
  legacyCopy(text, successCallback, errorCallback);
}

function legacyCopy(text: string, successCallback: () => void, errorCallback: (e: unknown) => void): void {
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.opacity = '0';
    textArea.style.position = 'absolute';
    document.body.appendChild(textArea);
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (!success) throw new Error('Copy failed');
    successCallback();
  } catch (e) {
    errorCallback(e);
  }
}
