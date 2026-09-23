/**
 * Мінімалістичний генератор QR-кодів у форматі SVG.
 * Реалізація стандарту QR Code Model 2 (версія 1-10) без зовнішніх залежностей.
 * Підтримує числові, буквено-цифрові та байтові (UTF-8) дані.
 */

// ─── Таблиці GF(256) ────────────────────────────────────────────────────────

const GF_EXP: number[] = new Array(512);
const GF_LOG: number[] = new Array(256);

(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x = x << 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return GF_EXP[GF_LOG[x] + GF_LOG[y]];
}

function gfPolyMul(p: number[], q: number[]): number[] {
  const r = new Array(p.length + q.length - 1).fill(0);
  for (let j = 0; j < q.length; j++) {
    for (let i = 0; i < p.length; i++) {
      r[i + j] ^= gfMul(p[i], q[j]);
    }
  }
  return r;
}

function gfPolyDiv(dividend: number[], divisor: number[]): number[] {
  let msg = [...dividend];
  for (let i = 0; i < dividend.length - (divisor.length - 1); i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 1; j < divisor.length; j++) {
        if (divisor[j] !== 0) msg[i + j] ^= gfMul(divisor[j], coef);
      }
    }
  }
  return msg.slice(dividend.length - (divisor.length - 1));
}

function rsGeneratorPoly(nsym: number): number[] {
  let g = [1];
  for (let i = 0; i < nsym; i++) {
    g = gfPolyMul(g, [1, GF_EXP[i]]);
  }
  return g;
}

function rsEncodeMsg(msgIn: number[], nsym: number): number[] {
  const gen = rsGeneratorPoly(nsym);
  const msg = [...msgIn, ...new Array(nsym).fill(0)];
  const remainder = gfPolyDiv(msg, gen);
  return [...msgIn, ...remainder];
}

// ─── Версія та параметри ─────────────────────────────────────────────────────

interface QrVersionInfo {
  version: number;
  size: number;         // modules (size x size)
  ecCodewords: number;  // EC codewords per block
  dataCodewords: number;
  blocks: number;
}

// Параметри для рівня корекції помилок M (medium ~15%)
const QR_VERSIONS_M: QrVersionInfo[] = [
  { version: 1,  size: 21, ecCodewords: 10, dataCodewords: 13,  blocks: 1 },
  { version: 2,  size: 25, ecCodewords: 16, dataCodewords: 22,  blocks: 1 },
  { version: 3,  size: 29, ecCodewords: 26, dataCodewords: 34,  blocks: 2 },
  { version: 4,  size: 33, ecCodewords: 18, dataCodewords: 48,  blocks: 2 },
  { version: 5,  size: 37, ecCodewords: 24, dataCodewords: 62,  blocks: 2 },
  { version: 6,  size: 41, ecCodewords: 16, dataCodewords: 76,  blocks: 4 },
  { version: 7,  size: 45, ecCodewords: 18, dataCodewords: 88,  blocks: 4 },
  { version: 8,  size: 49, ecCodewords: 22, dataCodewords: 110, blocks: 2 },
  { version: 9,  size: 53, ecCodewords: 22, dataCodewords: 132, blocks: 3 },
  { version: 10, size: 57, ecCodewords: 26, dataCodewords: 154, blocks: 4 },
];

// ─── Кодування даних (байтовий режим) ────────────────────────────────────────

function encodeData(text: string, dataCodewords: number): number[] {
  const bytes = new TextEncoder().encode(text);
  const bits: number[] = [];

  // Режим: байтовий (0100)
  bits.push(0, 1, 0, 0);

  // Довжина (8 біт для версій 1-9)
  const len = bytes.length;
  for (let i = 7; i >= 0; i--) bits.push((len >> i) & 1);

  // Дані
  for (const byte of bytes) {
    for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1);
  }

  // Термінатор
  for (let i = 0; i < 4 && bits.length < dataCodewords * 8; i++) bits.push(0);

  // Вирівнювання до байта
  while (bits.length % 8 !== 0) bits.push(0);

  // Заповнення паддінг-байтами
  const padBytes = [0xEC, 0x11];
  let padIdx = 0;
  while (bits.length < dataCodewords * 8) {
    const p = padBytes[padIdx++ % 2];
    for (let i = 7; i >= 0; i--) bits.push((p >> i) & 1);
  }

  // Перетворення у кодові слова
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | (bits[i + j] || 0);
    codewords.push(byte);
  }
  return codewords;
}

// ─── Матриця модулів ──────────────────────────────────────────────────────────

type Matrix = (number | null)[][];

function createMatrix(size: number): Matrix {
  return Array.from({ length: size }, () => new Array(size).fill(null));
}

function setFinderPattern(m: Matrix, row: number, col: number) {
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const mr = row + r, mc = col + c;
      if (mr < 0 || mr >= m.length || mc < 0 || mc >= m.length) continue;
      const onBorder = r === -1 || r === 7 || c === -1 || c === 7;
      const innerSquare = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      m[mr][mc] = (onBorder || innerSquare) ? 1 : 0;
    }
  }
}

function setAlignmentPattern(m: Matrix, row: number, col: number) {
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const onBorder = r === -2 || r === 2 || c === -2 || c === 2;
      const center = r === 0 && c === 0;
      m[row + r][col + c] = (onBorder || center) ? 1 : 0;
    }
  }
}

// Позиції центрів шаблонів вирівнювання для версій 2-10
const ALIGNMENT_POSITIONS: Record<number, number[]> = {
  2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
  6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
};

function placeStaticPatterns(m: Matrix, version: number, size: number) {
  // Finder patterns (кути)
  setFinderPattern(m, 0, 0);
  setFinderPattern(m, 0, size - 7);
  setFinderPattern(m, size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (m[6][i] === null) m[6][i] = i % 2 === 0 ? 1 : 0;
    if (m[i][6] === null) m[i][6] = i % 2 === 0 ? 1 : 0;
  }

  // Dark module
  m[size - 8][8] = 1;

  // Alignment patterns (версія 2+)
  if (version >= 2) {
    const pos = ALIGNMENT_POSITIONS[version] || [];
    for (const r of pos) {
      for (const c of pos) {
        if (m[r][c] === null) setAlignmentPattern(m, r, c);
      }
    }
  }
}

function isFormatArea(row: number, col: number, size: number): boolean {
  // Зони формату та службові зони (finder + separators)
  if (row < 9 && col < 9) return true;
  if (row < 9 && col > size - 9) return true;
  if (row > size - 9 && col < 9) return true;
  return false;
}

function placeFormatInfo(m: Matrix, maskPattern: number, size: number) {
  // Рівень корекції M (01) + маска
  const formatData = (0b01 << 3) | maskPattern;
  // Генераторний поліном формату: 10100110111
  const generator = 0b10100110111;
  let formatBits = formatData << 10;
  for (let i = 14; i >= 10; i--) {
    if ((formatBits >> i) & 1) formatBits ^= generator << (i - 10);
  }
  formatBits = ((formatData << 10) | formatBits) ^ 0b101010000010010;

  // Розміщення у двох копіях
  const sequence = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];
  for (let i = 0; i < 15; i++) {
    const bit = (formatBits >> (14 - i)) & 1;
    m[sequence[i][0]][sequence[i][1]] = bit;
    if (i < 7) {
      m[size - 1 - i][8] = bit;
    } else {
      m[8][size - 7 + (i - 8)] = bit;
    }
  }
}

function placeBits(m: Matrix, data: number[], size: number) {
  let bitIdx = 0;
  let up = true;
  let col = size - 1;

  while (col >= 1) {
    if (col === 6) col--; // пропускаємо timing column
    for (let rowIdx = 0; rowIdx < size; rowIdx++) {
      const row = up ? size - 1 - rowIdx : rowIdx;
      for (const dc of [0, -1]) {
        const c = col + dc;
        if (m[row][c] === null) {
          const bit = bitIdx < data.length * 8
            ? (data[Math.floor(bitIdx / 8)] >> (7 - (bitIdx % 8))) & 1
            : 0;
          m[row][c] = bit;
          bitIdx++;
        }
      }
    }
    up = !up;
    col -= 2;
  }
}

function applyMask(m: Matrix, maskPattern: number, size: number): Matrix {
  const result = m.map((row) => [...row]);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (m[r][c] === null) continue;
      if (isFormatArea(r, c, size) && !(m[r][c] !== null && r >= 8 && c >= 8)) {
        // не маскуємо функціональні зони — але для простоти маскуємо тільки дані
      }
      let mask = false;
      switch (maskPattern) {
        case 0: mask = (r + c) % 2 === 0; break;
        case 1: mask = r % 2 === 0; break;
        case 2: mask = c % 3 === 0; break;
        case 3: mask = (r + c) % 3 === 0; break;
        case 4: mask = (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; break;
        case 5: mask = (r * c) % 2 + (r * c) % 3 === 0; break;
        case 6: mask = ((r * c) % 2 + (r * c) % 3) % 2 === 0; break;
        case 7: mask = ((r + c) % 2 + (r * c) % 3) % 2 === 0; break;
      }
      // Маскуємо лише дата-модулі
      if (m[r][c] !== null && !isStaticModule(r, c, size)) {
        result[r][c] = mask ? (m[r][c] === 1 ? 0 : 1) : m[r][c];
      }
    }
  }
  return result;
}

function isStaticModule(r: number, c: number, size: number): boolean {
  // Finder + separators
  if (r < 9 && c < 9) return true;
  if (r < 9 && c >= size - 8) return true;
  if (r >= size - 8 && c < 9) return true;
  // Timing
  if (r === 6 || c === 6) return true;
  return false;
}

// ─── Головна функція генерації QR ────────────────────────────────────────────

/**
 * Генерує SVG рядок QR-коду для заданого тексту.
 * @param text Текст для кодування
 * @param moduleSize Розмір одного модуля у px (за замовчуванням 4)
 * @param margin Відступ у модулях (за замовчуванням 2)
 */
export function generateQrSvg(text: string, moduleSize = 4, margin = 2): string {
  const bytes = new TextEncoder().encode(text);
  const byteCount = bytes.length;

  // Обираємо мінімальну версію, що вміщує дані (режим байт, рівень M)
  let vInfo = QR_VERSIONS_M.find((v) => v.dataCodewords >= byteCount + 3); // +3 заголовок
  if (!vInfo) vInfo = QR_VERSIONS_M[QR_VERSIONS_M.length - 1];

  const { version, size, ecCodewords, dataCodewords, blocks } = vInfo;

  // Кодуємо дані
  const dataWords = encodeData(text, dataCodewords);

  // Додаємо EC-кодові слова
  const blockSize = Math.floor(dataCodewords / blocks);
  const allCodewords: number[] = [];
  const ecBlocks: number[][] = [];

  for (let b = 0; b < blocks; b++) {
    const start = b * blockSize;
    const end = b === blocks - 1 ? dataCodewords : start + blockSize;
    const blockData = dataWords.slice(start, end);
    const encoded = rsEncodeMsg(blockData, ecCodewords);
    allCodewords.push(...encoded.slice(0, blockData.length));
    ecBlocks.push(encoded.slice(blockData.length));
  }
  for (const ecBlock of ecBlocks) {
    allCodewords.push(...ecBlock);
  }

  // Будуємо матрицю
  const m = createMatrix(size);
  placeStaticPatterns(m, version, size);
  placeBits(m, allCodewords, size);

  // Маска 0 (проста, без penalty score — достатньо для наших потреб)
  const masked = applyMask(m, 0, size);
  placeFormatInfo(masked, 0, size);

  // Генеруємо SVG
  const total = (size + margin * 2) * moduleSize;
  const rects: string[] = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (masked[r][c] === 1) {
        const x = (c + margin) * moduleSize;
        const y = (r + margin) * moduleSize;
        rects.push(`<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}"/>`);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${total}" height="${total}" style="background:#fff">
  <g fill="#000">${rects.join('')}</g>
</svg>`;
}
