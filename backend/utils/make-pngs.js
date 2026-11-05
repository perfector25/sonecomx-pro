const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function run() {
  const originalPlomberie = 'C:/Users/ANTHONY/.gemini/antigravity/brain/2d9138bd-175f-47a3-a930-d73c1ffe738b/.user_uploaded/media_1789129496326.png';
  
  // 1. Plomberie Industrielle
  const resizedPlomberie = await sharp(originalPlomberie)
    .resize(720, 720, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([{ input: resizedPlomberie, gravity: 'center' }])
    .png()
    .toFile(path.join(__dirname, '../../frontend/public/images/categories/plomberie-industrielle.png'));

  // 2. Electromenager
  const svgElectromenager = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
    <g fill="#5C6670" transform="translate(162, 162) scale(0.68)">
      <rect x="220" y="140" width="560" height="720" rx="70" fill="none" stroke="#5C6670" stroke-width="60" />
      <line x1="220" y1="330" x2="780" y2="330" stroke="#5C6670" stroke-width="40" />
      <circle cx="350" cy="235" r="45" fill="#5C6670" />
      <circle cx="350" cy="235" r="20" fill="#ffffff" />
      <rect x="460" y="210" width="140" height="50" rx="16" fill="#5C6670" />
      <circle cx="670" cy="235" r="25" fill="#5C6670" />
      <circle cx="500" cy="580" r="180" fill="none" stroke="#5C6670" stroke-width="50" />
      <circle cx="500" cy="580" r="120" fill="#5C6670" />
      <path d="M 420 570 Q 470 530 520 570 Q 560 610 575 580 A 120 120 0 0 1 425 580 Z" fill="#ffffff" opacity="0.9" />
      <circle cx="460" cy="515" r="14" fill="#ffffff" />
      <rect x="280" y="855" width="70" height="35" rx="10" fill="#5C6670" />
      <rect x="650" y="855" width="70" height="35" rx="10" fill="#5C6670" />
    </g>
  </svg>`;

  await sharp(Buffer.from(svgElectromenager))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(__dirname, '../../frontend/public/images/categories/electromenager.png'));

  console.log('✅ Real binary PNGs generated successfully!');
}

run().catch(console.error);
