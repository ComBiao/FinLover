import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

import '../src/models/User';
import '../src/models/Wallet';
import '../src/models/Category';
import '../src/models/Transaction';

const generateMermaid = () => {
  let erd = 'erDiagram\n';

  // 1. Define Strict Relationships
  erd += '  User ||--o{ Wallet : "owns"\n';
  erd += '  User ||--o{ Category : "creates"\n';
  erd += '  User ||--o{ Transaction : "makes"\n';
  erd += '  Wallet ||--o{ Transaction : "funds"\n';
  erd += '  Category ||--o{ Transaction : "categorizes"\n\n';

  // 2. Extract Entities and Fields
  for (const modelName of mongoose.modelNames()) {
    erd += `  ${modelName} {\n`;
    const schema = mongoose.model(modelName).schema;
    
    for (const pathName of Object.keys(schema.paths)) {
      if (pathName === '__v') continue;
      const type = schema.paths[pathName].instance;
      erd += `    ${type} ${pathName}\n`;
    }
    erd += `  }\n\n`;
  }

  // 3. Save to docs/ERD.md
  const docsDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

  const mdContent = `# Fin Lover Database Architecture\n\n\`\`\`mermaid\n${erd}\`\`\`\n`;
  fs.writeFileSync(path.join(docsDir, 'ERD.md'), mdContent);
  
  console.log('✅ Clean Mermaid ERD successfully generated at docs/ERD.md');
  process.exit(0);
};

generateMermaid();