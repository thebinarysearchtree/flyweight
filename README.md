# Flyweight
An ORM for SQLite and NodeJS. Flyweight is different from other ORMs in that it combines a very simple API for performing basic operations, with the ability to create SQL queries that are typed and automatically mapped to complex object types.

The following examples are based on a hypothetical UFC database with the following structure:

A UFC event has a name, a location, and a start time. Each event has one or more cards (the main card, the preliminary cards). Each card has many fights. Each fight has a red corner and a blue corner, representing the two fighters.

The events table looks like this:

```sql
create table events (
    id integer primary key,
    name text not null,
    startTime date not null,
    locationId integer references locations
);
```

Tables are created with SQL, not with a custom API. Even though SQLite only has a few types built in, Flyweight allows you to create your own types, which are converted to and from the database. In this example, the ```startTime``` column is using the new ```date``` type.

Flyweight parses your sql statements and tables, and creates an API that is typed with TypeScript. Each table has a singular and plural form. If you want to get one row with the basic API, you can use:

```js
const event = await db.event.get({ id: 100 });
```

If you want to get many rows, you can use:

```js
const names = await db.events.get({ id: eventIds }, 'name');
```

If you want to insert a row, you can do:

```js
const id = await db.coach.insert({
  name: 'Eugene Bareman',
  city: 'Auckland'
});
```

The basic API does not allow you to perform joins, aggregate functions, or anything else. When you need these features, you simply create a SQL file in a folder with the name of one of the tables. This will then be parsed and typed by Flyweight, and available as part of the API.

By using conventions, Flyweight is able to automatically map SQL statements into nested objects without any extra code. For example, the following SQL statement:

```sql
select
    e.id as eventId,
    e.name as eventName,
    c.id as cardId,
    c.cardName,
    f.id as fightId,
    f.blueId,
    bf.name as blueName,
    bf.social as blueSocial,
    f.redId,
    rf.name as redName,
    rf.social as redSocial
from
    events e join
    cards c on c.eventId = e.id join
    fights f on f.cardId = c.id join
    fighters bf on f.blueId = bf.id join
    fighters rf on f.redId = rf.id
where e.id = $id
```

is contained in a file called ```getById.sql``` in the ```events``` folder. It can be called from the API like this:

```js
const event = await db.event.getById({ id: 100 });
```

This returns an object that looks like this:

```js
{
  id: 100,
  name: 'UFC 78: Validation',
  cards: [
    { id: 247, cardName: 'Main card (PPV)', fights: [Array] },
    { id: 248, cardName: 'Preliminary card', fights: [Array] }
  ]
}
```

With each fight in the fights array looking like this:

```js
{
  id: 805,
  blue: {
    id: 708,
    name: 'Rashad Evans',
    social: { instagram: 'sugarashadevans', twitter: 'SugaRashadEvans' }
  },
  red: {
    id: 236,
    name: 'Michael Bisping',
    social: { instagram: 'mikebisping', twitter: 'bisping' }
  }
}
```

Now let's look at how Flyweight does this without you having to specify any mapping code. It all comes down to the select statement:

```sql
  e.id as eventId,          // primary key
  e.name as eventName,
  c.id as cardId,           // primary key
  c.cardName,
  f.id as fightId,          // primary key
  f.blueId,                 // foreign key
  bf.name as blueName,
  bf.social as blueSocial,
  f.redId,                  // foreign key
  rf.name as redName,
  rf.social as redSocial
```

Every time you want to create an array within an object (such as the ```cards``` array in the main object), you include a primary key. Every column including and after the primary key forms the keys of the objects inside the array. Flyweight takes the name of the column (eg cardId), removes the Id part, and then converts the name into its plural form to create the name of the array (eg cards).

If you didn't want to create a cards array but wanted to include the cardId, you would just select f.cardId, which is a foreign key on the fights table rather than a primary key.

If you wanted to create a nested object inside an object (such as the red and blue in this example), you select a foreign key (such as blueId) and then give any other columns after blueId the same prefix (blue), and they will be included in the object with the prefix removed.

The social column is an object because in the fighters table, it is defined with the type ```json```, which is automatically parsed into an object.