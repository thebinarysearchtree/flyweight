import { db } from './db.js';

const getDigits = (n) => {
  let s = '';
  for (let i = 0; i < n; i++) {
    s += Math.floor(Math.random() * 10);
  }
}

const getNumbers = () => {
  const phone = [];
  const count = Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i++) {
    const n = `04${getDigits(2)} ${getDigits(3)} ${getDigits(3)}`;
    phone.push(n);
  }
  return phone;
}

const fighterIds = await db.fighters.many(null, 'id');

for (const fighterId of fighterIds) {
  const phone = getNumbers();
  if (phone.length > 0) {
    await db.fighters.update({
      where: { id: fighterId },
      set: { phone }
    });
  }
}