/** Inner SVG content (paths, lines, circles) for each named icon. */
export const ICON_PATHS: Record<string, string> = {
  book: '<path d="M4 19.5C4 18.837 4.263 18.201 4.732 17.732C5.201 17.263 5.837 17 6.5 17H20"/><path d="M6.5 2H20V20H6.5C5.837 20 5.201 19.737 4.732 19.268C4.263 18.799 4 18.163 4 17.5V4.5C4 3.837 4.263 3.201 4.732 2.732C5.201 2.263 5.837 2 6.5 2Z"/>',

  bookReading: '<path d="M4 19.5C4 18.837 4.263 18.201 4.732 17.732C5.201 17.263 5.837 17 6.5 17H20"/><path d="M6.5 2H20V20H6.5C5.837 20 5.201 19.737 4.732 19.268C4.263 18.799 4 18.163 4 17.5V4.5C4 3.837 4.263 3.201 4.732 2.732C5.201 2.263 5.837 2 6.5 2Z"/><line x1="12" y1="6" x2="12" y2="18"/>',

  close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',

  star: '<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>',

  checkmark: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',

  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/>',

  chevronRight: '<polyline points="9 18 15 12 9 6"/>',

  openBook: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',

  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',

  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',

  helpCircle: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',

  arrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',

  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',

  mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',

  lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',

  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',

  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',

  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',

  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
};

export type IconName = keyof typeof ICON_PATHS;

interface IconOptions {
  size?: number;
  class?: string;
  strokeWidth?: number;
  fill?: string;
  stroke?: string;
}

/**
 * Returns an SVG icon HTML string for use in template literals.
 *
 * Usage: `${icon('book', { size: 32 })}`
 */
export function icon(name: string, opts: IconOptions = {}): string {
  const paths = ICON_PATHS[name];
  if (!paths) return '';

  const {
    size = 24,
    class: className,
    strokeWidth,
    fill = 'none',
    stroke = 'currentColor',
  } = opts;

  const attrs: string[] = [
    `width="${size}"`,
    `height="${size}"`,
    `viewBox="0 0 24 24"`,
    `fill="${fill}"`,
    `stroke="${stroke}"`,
  ];

  if (strokeWidth) {
    attrs.push(`stroke-width="${strokeWidth}"`);
    attrs.push('stroke-linecap="round"');
    attrs.push('stroke-linejoin="round"');
  }
  if (className) {
    attrs.push(`class="${className}"`);
  }
  attrs.push('aria-hidden="true"');

  return `<svg ${attrs.join(' ')}>${paths}</svg>`;
}
