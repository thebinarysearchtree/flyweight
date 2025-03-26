import { db } from './db.js';
import { strict as assert } from 'assert';
import { compare } from './utils.js';

const run = async () => {
  const cards = await db.cards.many({ eventId: 100 });
  const fighterId = await db.fighters.get({ name: s => s.like('Israel%') }, 'id');

  compare(cards, 'cardsGet');
  assert.equal(fighterId, 17);

  const id = await db.coaches.insert({
    name: 'Eugene Bareman',
    city: 'Auckland'
  });
  assert.equal(id, 1);
  const inserted = await db.coaches.get({ id: 1 });
  assert.notEqual(inserted, undefined);
  assert.equal(inserted.city, 'Auckland');
  await db.coaches.update({
    where: { id: 1 },
    set: { city: 'Brisbane' }
  });
  const updated = await db.coaches.get({ id: 1 });
  assert.equal(updated.city, 'Brisbane');
  await db.coaches.remove({ id: 1 });
  const removed = await db.coaches.get({ id: 1 });
  assert.equal(removed, undefined);
  const limited = await db.fighters.query({ limit: 10 });
  assert.equal(limited.length, 10);
  const profiles = await db.fighterProfiles.query({
    where: { 
      fighterProfiles: 'Sao'
    },
    highlight: { 
      column: 'hometown', 
      tags: ['<b>', '</b>'] 
    }, 
    bm25: { 
      name: 1, 
      hometown: 10 
    },
    limit: 5
  });
  compare(profiles, 'fighterProfiles');
  await db.coaches.remove();
  await db.coaches.insert({ name: 'Andrew', city: 'Brisbane' });
  await db.coaches.insert({ name: 'Andrew', city: 'Brisbane' });
  await db.coaches.update({
    where: { name: 'Andrew' },
    set: { name: 'Eugene' }
  });
  const count = await db.coaches.count({ name: 'Eugene' });
  assert.equal(count, 2);
  await db.coaches.remove();
  const fighterCount = await db.fighters.count({
    where: { 
      id: n => n.range({ gt: 10, lt: 15 }) 
    }
  });
  assert.equal(fighterCount, 4);
  const whereSelector = await db.fighters.get({ social: s => s.instagram.eq('angga_thehitman') });
  assert.equal(whereSelector.id, 2);
  const accounts = await db.fighters.many({ id: n => n.lt(10) }, c => c.social.instagram);
  assert.equal(accounts.at(6), 'makamboabedi');
  const orderBy = await db.fighters.query({
    where: {
      id: n => n.lt(10)
    },
    select: ['id', 'born'],
    alias: {
      instagram: s => s.social.instagram
    },
    orderBy: 'instagram'
  });
  assert.equal(orderBy.at(2).instagram, 'angga_thehitman');
  const rows = [];
  for (let i = 0; i < 5; i++) {
    rows.push({
      name: 'test',
      city: 'test'
    });
  }
  await db.coaches.insertMany(rows);
  const insertCount = await db.coaches.count();
  assert.equal(insertCount, 5);
  await db.coaches.remove();
  const phone = await db.fighters.get({ 
    id: 5, 
    phone: p => p.includes('0430 473 923') 
  });
  assert.equal(phone !== undefined, true);
  const document = await db.fighters.get({ 
    id: 521,
    documents: d => d.some(f => f.documentId.eq(32)) 
  });
  assert.equal(document !== undefined, true);
  const file = await db.fighters.get({
    id: 65,
    documents: d => d.some(v => v.files.some(f => f.name.eq('filename2.jpg'))) 
  });
  assert.equal(file !== undefined, true);
  const phoneTest = await db.fighters.get({ 
    id: 5, 
    phone: p => p.some(v => v.like('% 473 923')) 
  });
  assert.equal(phoneTest !== undefined, true);
  const upsertId = await db.coaches.insert({
    name: 'Test User',
    city: 'Test City'
  });
  await db.coaches.upsert({
    values: {
      id: upsertId,
      name: 'Not User',
      city: 'Not City'
    },
    target: 'id',
    set: {
      city: 'Updated City'
    }
  });
  const upsert = await db.coaches.get({ id: upsertId });
  assert.equal(upsert.city, 'Updated City');
  await db.coaches.remove();
  const first = await db.fighters.first({
    where: {
      id: 3
    }
  });
  assert.equal(first.id, 3);
  const locations = await db.locations.query({
    where: {
      id: n => n.range({ gt: 109, lt: 120 })
    },
    include: {
      events: (t, c) => t.events.query({
        where: {
          locationId: c.id
        },
        orderBy: 'startTime',
        desc: true,
        offset: 1,
        limit: 3
      })
    }
  });
  assert.equal(locations.at(0).events.at(1).id, 415);
  const events = await db.events.query({
    include: {
      location: (t, c) => t.locations.get({ id: c.locationId })
    },
    limit: 3
  });
  const event = events.at(1);
  assert.equal(event.location.id, event.locationId);
  const corner = (colour) => (t, c) => t.fighters.get({ id: c[`${colour}Id`] });
  const fight = await db.fights.first({
    where: {
      id: 10
    },
    include: {
      blue: corner('blue'),
      red: corner('red')
    }
  });
  assert.equal(fight.blue.id, fight.blueId);
  assert.equal(fight.red.id, fight.redId);
  const popular = await db.locations.query({
    include: {
      latest: (t, c) => t.events.first({
        include: {
          cards: (t, c) => t.cards.many({ eventId: c.id })
        },
        where: {
          locationId: c.id
        },
        orderBy: 'startTime',
        desc: true
      }),
      eventCount: (t, c) => t.events.count({
        where: {
          locationId: c.id
        }
      })
    },
    orderBy: 'eventCount',
    desc: true,
    limit: 3
  });
  assert.equal(popular.at(1).latest.cards.length, 3);
  assert.equal(popular.at(0).eventCount, 67);
  const latest = await db.locations.query({
    select: ['id', 'name'],
    where: {
      id: n => n.range({ gt: 109, lt: 120 })
    },
    include: {
      latest: (t, c) => t.events.first({
        include: {
          cards: (t, c) => t.cards.many({ eventId: c.id })
        },
        where: {
          locationId: c.id
        },
        orderBy: 'startTime',
        desc: true
      })
    }
  });
  assert.equal(latest.at(0).latest.id, 502);
  const total = await db.fighters.count({
    where: {
      heightCm: n => n.not(null)
    }
  });
  const sum = await db.fighters.sum({ column: 'heightCm' });
  const avg = await db.fighters.avg({ column: 'heightCm' });
  assert.equal(avg, sum / total);
  const ordered = await db.events.query({
    include: {
      locationName: (t, c) => t.locations.get({ id: c.locationId }, 'name')
    },
    orderBy: 'locationName',
    limit: 3
  });
  assert.equal(ordered.at(2).id, 308);
  assert.equal(ordered.length, 3);
  const singleCount = await db.locations.first({
    where: {
      id: 45
    },
    include: {
      eventsCount: (t, c) => t.events.count({
        where: {
          locationId: c.id
        }
      })
    }
  });
  assert.equal(singleCount.eventsCount, 18);
  const whereIncludes = await db.locations.query({
    select: ['id', 'name'],
    where: {
      name: n => n.like('P%'),
      count: c => c.gt(4)
    },
    include: {
      count: (t, c) => t.events.count({
        where: {
          locationId: c.id
        }
      })
    },
    orderBy: 'count',
    desc: true
  });
  assert.equal(whereIncludes.at(0).count, 18);
  const defined = await db.locations.query({
    include: {
      events: t => t.events.query({
        limit: 3,
        orderBy: 'startTime',
        desc: true
      })
    },
    limit: 3
  });
  assert.equal(defined.at(1).events.length, 2);
  const time = new Date();
  time.setFullYear(1997);
  const conditions = await db.events.query({
    where: {
      id: n => n.lt(29),
      or: [
        { name: n => n.like('UFC 1_: The%') },
        { id: n => n.lt(10) },
        {
          and: [
            { startTime: n => n.gt(time) },
            { name: n => n.like('%Japan%') }
          ]
        }
      ]
    }
  });
  assert.equal(conditions.at(12).id, 18);
}

const cleanUp = async () => {
  await db.coaches.remove();
}

export default {
  name: 'queries',
  run,
  cleanUp
};
