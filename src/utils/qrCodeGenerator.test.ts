import { describe, it, expect } from 'vitest';
import { generateQrSvg } from './qrCodeGenerator';

describe('qrCodeGenerator', () => {
  it('generates a valid SVG string for a given URL', () => {
    const svg = generateQrSvg('https://example.com/#/my/std-12345');
    expect(svg).toBeDefined();
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('<rect');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('respects module size and margin parameters', () => {
    const svgDefault = generateQrSvg('TEST', 4, 2);
    const svgLarge = generateQrSvg('TEST', 6, 2);
    expect(svgDefault).toContain('width=');
    expect(svgLarge).toContain('width=');
    expect(svgDefault).not.toEqual(svgLarge);
  });
});
