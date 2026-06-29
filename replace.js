const fs = require('fs');
const path = require('path');

const filesToProcess = [
  'frontend/src/pages/CustomerDashboard.tsx',
  'frontend/src/pages/AdminBookings.tsx',
  'frontend/src/pages/CheckoutConfirm.tsx',
  'frontend/src/pages/CheckoutSuccess.tsx',
  'frontend/src/pages/BookingSummary.tsx',
  'frontend/src/components/AdminBookingDetailsModal.tsx',
  'frontend/src/pages/AdminUpcomingBookings.tsx',
  'frontend/src/pages/AdminPayments.tsx',
  'frontend/src/pages/CustomerDetails.tsx',
  'frontend/src/pages/VehicleDetails.tsx'
];

filesToProcess.forEach(file => {
  const fullPath = path.join('d:\\\\New folder\\\\Granja Xtreme (ATV_Rental_System)', file);
  if (!fs.existsSync(fullPath)) return;
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let originalContent = content;
  
  // Add import if needed
  if (!content.includes('formatAtvName')) {
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfLastImport = content.indexOf('\n', lastImportIndex);
      const isComponent = file.includes('components');
      const importPath = isComponent ? '../utils/formatAtv' : '../utils/formatAtv';
      const importStatement = `\nimport { formatAtvName } from '${importPath}';`;
      content = content.slice(0, endOfLastImport) + importStatement + content.slice(endOfLastImport);
    }
  }

  // 1. {b.atvId.name} ({b.atvId.model}) -> {formatAtvName(b.atvId)}
  content = content.replace(/\{([a-zA-Z0-9_]+)\.atvId\??\.name\}\s*\(\s*\{?\1\.atvId\??\.model\}?\s*\)/g, '{formatAtvName($1.atvId)}');
  
  // 2. {b.atvId.name} {b.atvId.model || ''} -> {formatAtvName(b.atvId)}
  content = content.replace(/\{([a-zA-Z0-9_]+)\.atvId\??\.name\}\s*\{?\1\.atvId\??\.model\s*\|\|\s*''\}?/g, '{formatAtvName($1.atvId)}');
  content = content.replace(/\{([a-zA-Z0-9_]+)\.atvId\??\.name\}\s*\{?\1\.atvId\??\.model\}?/g, '{formatAtvName($1.atvId)}');

  // 3. <h3>{rental.atvId.name}</h3> \n <p>Model: {rental.atvId.model}</p>
  content = content.replace(/(<[a-zA-Z0-9]+[^>]*>)\{([a-zA-Z0-9_]+)\.atvId\??\.name\}(<\/[a-zA-Z0-9]+>)\s*<p[^>]*>.*?\{?\2\.atvId\??\.model\}?.*?<\/p>/g, '$1{formatAtvName($2.atvId)}$3');

  // 4. Any remaining {b.atvId.name} without model (except inside alt attributes)
  // We can use a regex that matches {obj.atvId?.name} but not alt={...}
  content = content.replace(/(?<!alt=)(?<!alt=")\{([a-zA-Z0-9_]+)\.atvId\??\.name\}/g, '{formatAtvName($1.atvId)}');

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content);
    console.log('Updated ' + file);
  }
});
