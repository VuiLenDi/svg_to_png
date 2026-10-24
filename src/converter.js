import DOMPurify from 'dompurify';

export const MAX_SOURCE_BYTES = 2 * 1024 * 1024;
const SVG_NS = 'http://www.w3.org/2000/svg';
const shapes = 'path,rect,circle,ellipse,polygon,polyline,line,text,tspan,use';

export function validateDimensions(width, height) {
  if (![width, height].every((value) => Number.isInteger(value) && value > 0 && value <= 8192)) {
    throw new Error('Chiều rộng và cao phải là số nguyên từ 1 đến 8192 px.');
  }
  if (width * height > 16_777_216) throw new Error('Ảnh quá lớn. Vui lòng giảm xuống tối đa 16 megapixel.');
}

export function parseSvg(source) {
  if (!source.trim()) throw new Error('Hãy dán nội dung hoặc chọn một file SVG.');
  if (new Blob([source]).size > MAX_SOURCE_BYTES) throw new Error('SVG vượt quá giới hạn 2 MB.');
  const document = new DOMParser().parseFromString(source, 'image/svg+xml');
  if (document.querySelector('parsererror') || document.documentElement.localName !== 'svg' || document.documentElement.namespaceURI !== SVG_NS) {
    throw new Error('SVG không hợp lệ. Kiểm tra thẻ <svg>, namespace và các thẻ đóng.');
  }
  const clean = DOMPurify.sanitize(source, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['foreignObject', 'script', 'animate', 'animateMotion', 'animateTransform', 'set', 'a'],
  });
  const svg = new DOMParser().parseFromString(clean, 'image/svg+xml').documentElement;
  if (svg.localName !== 'svg' || svg.querySelector('parsererror')) throw new Error('Không thể đọc nội dung SVG.');
  for (const element of [svg, ...svg.querySelectorAll('*')]) {
    for (const attribute of [...element.attributes]) {
      if (attribute.localName === 'href' && !attribute.value.startsWith('#')) element.removeAttributeNode(attribute);
    }
    if (element.hasAttribute('style')) element.setAttribute('style', localResources(element.getAttribute('style')));
    if (element.localName === 'style') element.textContent = localResources(element.textContent);
    for (const attribute of [...element.attributes]) {
      if (/url\s*\(/i.test(attribute.value)) element.setAttribute(attribute.name, localResources(attribute.value));
    }
  }
  const viewBox = svg.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
  const validViewBox = viewBox?.length === 4 && viewBox.every(Number.isFinite) && viewBox[2] > 0 && viewBox[3] > 0;
  const length = (value) => {
    const match = value?.trim().match(/^(\d+(?:\.\d+)?)(px|pt|pc|mm|cm|in)?$/i);
    const units = { px: 1, pt: 96 / 72, pc: 16, mm: 96 / 25.4, cm: 96 / 2.54, in: 96 };
    return match ? Number(match[1]) * (units[match[2]?.toLowerCase()] || 1) : 0;
  };
  const width = length(svg.getAttribute('width')) || (validViewBox ? viewBox[2] : 512);
  const height = length(svg.getAttribute('height')) || (validViewBox ? viewBox[3] : 512);
  if (!validViewBox) svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('xmlns', SVG_NS);
  return { svg, width, height };
}

function localResources(css) {
  return css.replace(/@import\s+[^;]+;?/gi, '').replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (match, quote, target) => target.trim().startsWith('#') ? match : 'none');
}

export function renderSvg(parsed, options) {
  const svg = parsed.svg.cloneNode(true);
  svg.setAttribute('width', String(options.width));
  svg.setAttribute('height', String(options.height));
  if (options.fill || options.stroke) {
    const frame = document.createElement('iframe');
    frame.hidden = true;
    frame.setAttribute('sandbox', 'allow-same-origin');
    document.body.append(frame);
    try {
      const frameDocument = frame.contentDocument;
      const policy = frameDocument.createElement('meta');
      policy.httpEquiv = 'Content-Security-Policy';
      policy.content = "default-src 'none'; style-src 'unsafe-inline'";
      frameDocument.head.append(policy);
      frameDocument.body.append(frameDocument.importNode(svg, true));
      const originals = frameDocument.querySelectorAll(shapes);
      const targets = svg.querySelectorAll(shapes);
      originals.forEach((element, index) => {
        const style = frame.contentWindow.getComputedStyle(element);
        if (options.fill && style.fill !== 'none') targets[index].style.setProperty('fill', options.fill, 'important');
        if (options.stroke) targets[index].style.setProperty('stroke', options.stroke, 'important');
      });
    } finally {
      frame.remove();
    }
  }
  return new XMLSerializer().serializeToString(svg);
}

export async function toPng(svg, width, height, background) {
  validateDimensions(width, height);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Trình duyệt không hỗ trợ canvas 2D.');
    if (background) {
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(image, 0, 0, width, height);
    return await new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Không thể tạo PNG. Hãy giảm kích thước ảnh.')), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}