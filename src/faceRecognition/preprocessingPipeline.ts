export interface PreprocessingOptions {
  histogramEqualization: boolean;
  brightnessNormalization: boolean;
  faceAlignment: boolean;
  contrastEnhancement: boolean;
}

const DEFAULT_OPTIONS: PreprocessingOptions = {
  histogramEqualization: true,
  brightnessNormalization: true,
  faceAlignment: true,
  contrastEnhancement: true,
};

export function applyPreprocessing(
  grayPixels: Uint8Array,
  width: number,
  height: number,
  options: Partial<PreprocessingOptions> = {}
): Float32Array {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let data: Float32Array = new Float32Array(grayPixels);

  if (opts.brightnessNormalization) {
    data = new Float32Array(normalizeBrightness(data));
  }

  if (opts.histogramEqualization) {
    data = new Float32Array(applyHistogramEqualization(data));
  }

  if (opts.contrastEnhancement) {
    data = new Float32Array(enhanceContrast(data));
  }

  return data;
}

function normalizeBrightness(data: Float32Array): Float32Array {
  const mean = data.reduce((s: number, v: number) => s + v, 0) / data.length;
  const std = Math.sqrt(data.reduce((s: number, v: number) => s + (v - mean) ** 2, 0) / data.length);

  if (std < 1) return data;

  const targetMean = 127;
  const targetStd = 64;

  const result = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const normalized = ((data[i] - mean) / std) * targetStd + targetMean;
    result[i] = Math.max(0, Math.min(255, normalized));
  }
  return result;
}

function applyHistogramEqualization(data: Float32Array): Float32Array {
  const hist = new Uint32Array(256);
  const intData = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    intData[i] = Math.round(Math.max(0, Math.min(255, data[i])));
    hist[intData[i]]++;
  }

  const cdf = new Uint32Array(256);
  cdf[0] = hist[0];
  for (let i = 1; i < 256; i++) {
    cdf[i] = cdf[i - 1] + hist[i];
  }

  let cdfMin = 0;
  for (let i = 0; i < 256; i++) {
    if (cdf[i] > 0) {
      cdfMin = cdf[i];
      break;
    }
  }

  const totalPixels = data.length;
  const result = new Float32Array(data.length);

  if (cdfMin === 0 || totalPixels === cdfMin) {
    result.set(data);
    return result;
  }

  for (let i = 0; i < data.length; i++) {
    result[i] = Math.round(((cdf[intData[i]] - cdfMin) / (totalPixels - cdfMin)) * 255);
  }

  return result;
}

function enhanceContrast(data: Float32Array): Float32Array {
  let min = data[0];
  let max = data[0];
  for (let i = 1; i < data.length; i++) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }
  const range = max - min;

  if (range < 1) {
    const r = new Float32Array(data.length);
    r.set(data);
    return r;
  }

  const lowPercentile = percentile(data, 5);
  const highPercentile = percentile(data, 95);
  const robustRange = highPercentile - lowPercentile;

  if (robustRange < 1) {
    const r = new Float32Array(data.length);
    r.set(data);
    return r;
  }

  const result = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const stretched = ((data[i] - lowPercentile) / robustRange) * 255;
    result[i] = Math.max(0, Math.min(255, stretched));
  }
  return result;
}

function percentile(data: Float32Array, p: number): number {
  const arr = new Float64Array(data);
  const sorted = arr.sort();
  const index = Math.floor((p / 100) * sorted.length);
  return sorted[Math.min(index, sorted.length - 1)];
}

export function estimateBrightness(grayPixels: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < grayPixels.length; i++) {
    sum += grayPixels[i];
  }
  return sum / grayPixels.length;
}

export function estimateContrast(grayPixels: Uint8Array): number {
  const mean = estimateBrightness(grayPixels);
  let sumSq = 0;
  for (let i = 0; i < grayPixels.length; i++) {
    sumSq += (grayPixels[i] - mean) ** 2;
  }
  return Math.sqrt(sumSq / grayPixels.length);
}

export function isLowLight(grayPixels: Uint8Array, threshold: number = 60): boolean {
  return estimateBrightness(grayPixels) < threshold;
}

export function isHarshLighting(grayPixels: Uint8Array): boolean {
  const contrast = estimateContrast(grayPixels);
  return contrast > 70;
}

export function getLightingCondition(grayPixels: Uint8Array): 'low' | 'normal' | 'harsh' {
  const brightness = estimateBrightness(grayPixels);
  const contrast = estimateContrast(grayPixels);

  if (brightness < 60) return 'low';
  if (contrast > 70 || brightness > 200) return 'harsh';
  return 'normal';
}
