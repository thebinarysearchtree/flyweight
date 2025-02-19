import { db } from './db.js';

const getCount = () => {
  return 1 + Math.floor(Math.random() * 4);
}

const getDigits = () => {
  const count = getCount();
  let s = '';
  for (let i = 0; i < count; i++) {
    s += Math.floor(Math.random() * 10);
  }
  return Number.parseInt(s) + 1;
}

const fighterIds = await db.fighters.many(null, 'id');

for (const fighterId of fighterIds) {
  if (Math.random() > 0.2) {
    continue;
  }
  const documents = [];
  const documentCount = getCount();
  for (let i = 0; i < documentCount; i++) {
    const files = [];
    const fileCount = getCount();
    for (let j = 0; j < fileCount; j++) {
      const tags = [];
      const tagCount = getCount();
      for (let k = 0; k < tagCount; k++) {
        tags.push(`tag${getDigits()}`);
      }
      files.push({
        tags,
        name: `filename${getDigits()}.jpg`
      });
    }
    documents.push({
      documentId: getDigits(),
      documentName: `Something${getDigits()}`,
      files
    });
  }
  await db.fighters.update({
    where: { id: fighterId },
    set: { documents }
  });
}