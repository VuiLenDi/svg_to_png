import { createIcons, ScanLine, ShieldCheck, Sparkles, Trash2, Upload, Image as ImageIcon, RotateCcw, Link, Unlink, Download, ArrowUpRight } from 'lucide';
import { MAX_SOURCE_BYTES, parseSvg, renderSvg, toPng, validateDimensions } from './converter.js';

const icons = { ScanLine, ShieldCheck, Sparkles, Trash2, Upload, Image: ImageIcon, RotateCcw, Link, Unlink, Download, ArrowUpRight };
const element = (id) => document.getElementById(id);
const sample = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect x="72" y="72" width="368" height="368" rx="90" fill="#16785b"/>
  <path d="M152 187L256 338L360 187" fill="none" stroke="#d5f5a3" stroke-width="38" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="355" cy="145" r="21" fill="#ffffff"/>
</svg>`;
let parsed = null;
let rendered = '';
let previewUrl = null;
let locked = true;
let filename = 'vector';
let timer;
let fileRevision = 0;

function showError(message = '') {
  element('error').textContent = message;
  element('error').hidden = !message;
}

function options() {
  const width = Number(element('width').value);
  const height = Number(element('height').value);
  validateDimensions(width, height);
  const colors = {};
  for (const channel of ['fill', 'stroke']) {
    if (!element(`${channel}-enabled`).checked) continue;
    const value = element(`${channel}-text`).value.trim();
    if (!/^#[\da-f]{6}$/i.test(value)) throw new Error(`Mã màu ${channel === 'fill' ? 'fill' : 'viền'} phải có dạng #RRGGBB.`);
    colors[channel] = value;
  }
  return { width, height, ...colors };
}

function hidePreview() {
  element('preview-image').hidden = true;
  element('empty').hidden = false;
  element('preview-dimensions').textContent = '';
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
}

function update() {
  clearTimeout(timer);
  element('convert').disabled = true;
  showError();
  element('source-size').textContent = `${element('source').value.length.toLocaleString('vi-VN')} ký tự`;
  if (!element('source').value.trim()) {
    parsed = null;
    hidePreview();
    return;
  }
  try {
    parsed = parseSvg(element('source').value);
    const settings = options();
    rendered = renderSvg(parsed, settings);
    const nextUrl = URL.createObjectURL(new Blob([rendered], { type: 'image/svg+xml;charset=utf-8' }));
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = nextUrl;
    element('preview-image').src = previewUrl;
    element('preview-image').hidden = false;
    element('empty').hidden = true;
    element('preview-dimensions').textContent = `${settings.width} × ${settings.height} px`;
    element('convert').disabled = false;
    element('status').textContent = `PNG · ${element('transparent').checked ? 'Nền trong suốt' : 'Nền màu'}`;
  } catch (error) {
    hidePreview();
    showError(error.message);
  }
}

function setSource(source, name) {
  element('source').value = source;
  filename = name.replace(/\.svg$/i, '') || 'vector';
  element('file-name').textContent = name;
  try {
    const dimensions = parseSvg(source);
    const scale = Math.min(1, 4096 / dimensions.width, 4096 / dimensions.height);
    element('width').value = Math.max(1, Math.round(dimensions.width * scale));
    element('height').value = Math.max(1, Math.round(dimensions.height * scale));
  } catch {
    parsed = null;
  }
  update();
}

async function loadFile(file) {
  if (!file) return;
  const revision = ++fileRevision;
  try {
    if (!/\.svg$/i.test(file.name)) throw new Error('Vui lòng chọn file có đuôi .svg.');
    if (file.size > MAX_SOURCE_BYTES) throw new Error('File vượt quá giới hạn 2 MB.');
    const source = await file.text();
    if (revision === fileRevision) setSource(source, file.name);
  } catch (error) {
    showError(error.message);
  }
}

element('source').addEventListener('input', () => {
  fileRevision++;
  element('convert').disabled = true;
  clearTimeout(timer);
  timer = setTimeout(() => {
    setSource(element('source').value, 'vector.svg');
  }, 250);
});
element('file').addEventListener('change', (event) => {
  loadFile(event.target.files[0]);
  event.target.value = '';
});
for (const eventName of ['dragenter', 'dragover']) {
  element('dropzone').addEventListener(eventName, (event) => {
    event.preventDefault();
    element('dropzone').classList.add('dragging');
  });
}
for (const eventName of ['dragleave', 'drop']) {
  element('dropzone').addEventListener(eventName, (event) => {
    event.preventDefault();
    element('dropzone').classList.remove('dragging');
    if (eventName === 'drop') loadFile(event.dataTransfer.files[0]);
  });
}
element('sample').addEventListener('click', () => {
  fileRevision++;
  setSource(sample, 'sample.svg');
});
element('clear').addEventListener('click', () => {
  fileRevision++;
  setSource('', '');
  element('file-name').textContent = 'Chưa chọn file';
  element('source').focus();
});
for (const channel of ['fill', 'stroke']) {
  element(`${channel}-enabled`).addEventListener('change', update);
  element(`${channel}-picker`).addEventListener('input', (event) => {
    element(`${channel}-text`).value = event.target.value.toUpperCase();
    element(`${channel}-enabled`).checked = true;
    update();
  });
  element(`${channel}-text`).addEventListener('input', (event) => {
    if (/^#[\da-f]{6}$/i.test(event.target.value)) element(`${channel}-picker`).value = event.target.value;
    element(`${channel}-enabled`).checked = true;
    update();
  });
}
for (const axis of ['width', 'height']) {
  element(axis).addEventListener('input', () => {
    if (locked && parsed) {
      const other = axis === 'width' ? 'height' : 'width';
      element(other).value = Math.max(1, Math.round(Number(element(axis).value) * parsed[other] / parsed[axis]));
    }
    update();
  });
}
element('lock').addEventListener('click', () => {
  locked = !locked;
  element('lock').setAttribute('aria-pressed', String(locked));
  element('lock').classList.toggle('active', locked);
  element('lock').title = locked ? 'Giữ tỷ lệ' : 'Tỷ lệ tự do';
  element('lock').setAttribute('aria-label', element('lock').title);
  element('lock').innerHTML = `<i data-lucide="${locked ? 'link' : 'unlink'}"></i>`;
  createIcons({ icons });
  if (locked && parsed) {
    element('height').value = Math.max(1, Math.round(Number(element('width').value) * parsed.height / parsed.width));
    update();
  }
});
element('transparent').addEventListener('change', () => {
  element('background').disabled = element('transparent').checked;
  element('preview').classList.toggle('checkerboard', element('transparent').checked);
  element('preview').style.backgroundColor = element('transparent').checked ? '' : element('background').value;
  update();
});
element('background').addEventListener('input', () => {
  element('preview').style.backgroundColor = element('background').value;
  update();
});
element('reset').addEventListener('click', () => {
  element('fill-enabled').checked = false;
  element('stroke-enabled').checked = false;
  element('fill-picker').value = '#16785b';
  element('fill-text').value = '#16785B';
  element('stroke-picker').value = '#172e27';
  element('stroke-text').value = '#172E27';
  element('transparent').checked = true;
  element('background').value = '#ffffff';
  element('background').disabled = true;
  element('preview').classList.add('checkerboard');
  element('preview').style.backgroundColor = '';
  if (!locked) element('lock').click();
  setSource(element('source').value, `${filename}.svg`);
});
element('convert').addEventListener('click', async () => {
  element('convert').disabled = true;
  element('status').textContent = 'Đang tạo PNG…';
  try {
    const settings = options();
    const blob = await toPng(rendered, settings.width, settings.height, element('transparent').checked ? null : element('background').value);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${filename}.png`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    element('status').textContent = `Đã tải ${filename}.png · ${(blob.size / 1024).toFixed(1)} KB`;
  } catch (error) {
    showError(`Không thể chuyển đổi: ${error.message}`);
    element('status').textContent = 'Chuyển đổi thất bại';
  } finally {
    element('convert').disabled = !parsed || !element('error').hidden;
  }
});
element('preview-image').addEventListener('error', () => {
  showError('Trình duyệt không thể hiển thị SVG này. Hãy kiểm tra nội dung ảnh.');
  element('convert').disabled = true;
});
createIcons({ icons });
setSource(sample, 'sample.svg');