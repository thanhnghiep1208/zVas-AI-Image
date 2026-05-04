
/**
 * Shim for formdata-polyfill to prevent it from patching window.fetch
 * which causes "TypeError: Cannot set property fetch of #<Window> which has only a getter"
 */
export const FormData = typeof window !== 'undefined' ? window.FormData : globalThis.FormData;
export const File = typeof window !== 'undefined' ? window.File : globalThis.File;
export const Blob = typeof window !== 'undefined' ? window.Blob : globalThis.Blob;

export default FormData;
