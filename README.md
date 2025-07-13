# Flyweight
Flyweight is a NodeJS ORM for SQLite and Turso.

Features include a comprehensive API, the ability to automatically type and query inside JSON, and advanced typing of raw SQL queries so that you are not without TypeScript support in any situation.

## Getting started

```
mkdir test
cd test
npm init
```

For a standard SQLite database, then run

```
npx create-flyweight database
```

For Turso, run

```
npx create-flyweight turso database
```

You can run the ```npx``` command at the root of either an existing or a new project. Once that is done, you can import the database this way:

```js
import { db } from './database/db.js';

await db.users.insert({ name: 'Andrew' });
const users = await db.users.many();
console.log(users);
```

A ```users``` table has already been created for you to play around with.

You can update types whenever you change the SQL by either calling ```npm run watch``` to automatically update the types, or ```npm run types``` to do it manually.

Configuration options can be found in the ```config.js``` file. Go to the [migrations](#migrations) section to learn how to start adding columns and tables.

## The API

Every table has ```get```, ```many```, ```first```, ```query```, ```update```, ```upsert```, ```insert```, ```insertMany```, and ```remove``` methods available to it, along with any of the custom methods that are created when you add a new SQL file to the corresponding table's folder. Views only have the ```get```, ```many```, ```first```, and ```query``` methods available to them.

### Insert

```insert``` simply takes one argument - ```params```, with the keys and values corresponding to the column names and values you want to insert. It returns the primary key, or part of the primary key if the table has a composite primary key. For batch inserts you can use ```insertMany``` and it takes an array of ```params```. It doesn't return anything.

```js
const id = await db.coaches.insert({
  name: 'Eugene Bareman',
  city: 'Auckland'
});
```

### Update

```update``` takes an object with an optional ```where``` property, and a ```set``` property. It returns a number representing the number of rows that were affected by the query. For example:

```js
await db.coaches.update({
  where: { id: 100 }, 
  set: { city: 'Brisbane' }
});
```

which corresponds to

```sql
update coaches set city = 'Brisbane' where id = 100;
```

If you want to update columns based on their existing value, you can pass a function into the ```set``` properties like this:

```js
await db.coaches.update({
  set: {
    city: (c, f) => f.concat(c.city, ', Australia')
  },
  where: {
    id: coachId
  }
});
```

All of the built-in SQLite functions are available, in addition to the mathematical operators ```plus```, ```minus```, ```divide```, and ```multiply```.

### Upsert

```upsert``` will update the row if the target's uniqueness contraint is violated by the insert. If ```target``` or ```set``` are not provided, the upsert will do nothing when there is a conflict. ```upsert``` returns the primary key of the inserted or updated row.

```js
const id = await db.coaches.upsert({
  values: {
    id: 1,
    name: 'Test User',
    city: 'Test City'
  },
  target: 'id',
  set: {
    city: 'Updated City'
  }
});
```

### Get and Many

```get``` and ```many``` take two optional arguments. The first is ```params``` - an object representing the where clause. For example:

```js
const fights = await db.fights.many({ cardId: 9, titleFight: true });
```

translates to

```sql
select * from fights where cardId = 9 and titleFight = 1;
```

The keys to ```params``` must be the column names of the table. The values can either be of the same type as the column, an array of values that are the same type as the column or null. If an array is passed in, an ```in``` clause is used, such as:

```js
const fights = await db.fights.many({ cardId: [1, 2, 3] });
```

which translates to

```sql
select * from fights where cardId in (1, 2, 3);
```

If null is passed in as the value, the SQL will use ```is null```.

All of the arguments are passed in as parameters for security reasons.

The second argument to ```get``` or ```many``` selects which columns to return. It can be one of the following:

1. a string representing a column to select. In this case, the result returned is a single value or array of single values, depending on whether ```get``` or ```many``` is used.

```js
const born = await db.fighters.get({ id: 3 }, 'born');
```

2. a lambda function that traverses a JSON object.

```js
const instagram = await db.fighters.get({ id: 3 }, c => c.social.instagram);
```

In this case, ```social``` is a JSON object with an ```instagram``` property.

3. an array of strings, representing the columns to select.

```js
const fighter = await db.fighters.get({ id: 3 }, ['id', 'born']);
```

### Query and First

You can use the ```query``` or ```first``` syntax for more complex queries. ```query``` returns an array in the same way as ```many```, and ```first``` returns an object or ```undefined``` if nothing is found. The additional keywords are:

```select```: a string or array of strings representing the columns to select.

```omit```: a string or array of strings representing the columns to omit. All of the other columns will be selected.

```include```: include other tables in the result.

```orderBy```: a string or an array representing the column or columns to order the result by. This can also be a function that utilises the built-in SQLite functions.

```js
const orderBy = await db.fighters.query({
  where: {
    hometown: 'Brisbane, Australia'
  },
  orderBy: (c, f) => f.lower(c.instagram)
});
```

```desc```: set to true when using ```orderBy``` if you want the results in descending order.

```limit``` and ```offset```: corresponding to the SQL keywords with the same name.

```distinct```: adds the ```distinct``` keywords to the start of the select clause.

```debug```: when set to true, the result will include debug information such as the raw SQL used in the query.

For example:

```js
const fighters = await db.fighters.query({
  where: { 
    isActive: true 
  }, 
  select: ['name', 'hometown'],
  orderBy: 'reachCm',
  limit: 10
});
```

You can also include additional relations:

```js
const locations = await db.locations.query({
  include: {
    events: (t, c) => t.events.query({ 
      where: {
        locationId: c.id
      }
    })
  }
});
```

While the default interpretation of the query parameters is ```=```, you can pass in a function to use ```not```, ```gt```, ```gte```, ```lt```, ```lte```, ```like```, ```match``` and ```glob```.

For example:

```js
const excluded = [1, 2, 3];
const users = await db.users.many({ id: c => c.not(excluded) });
const count = await db.users.count({
  where: {
    id: c => c.gt(10)
  }
});
```

### Complex filtering

If you need to perform complex logic in the ```where``` clause, you can use the ```and``` or ```or``` properties. For example:

```js
const events = await db.events.query({
  where: {
    or: [
      { name: c => c.like('UFC 1_: The%') },
      { id: c => c.lt(10) },
      {
        and: [
          { startTime: c => c.gt(time) },
          { name: c => c.like('%Japan%') }
        ]
      }
    ]
  }
});
```

You should only include one condition per object.

### Aggregate functions

There are multiple functions that aggregate the results into a single value. These include ```count```, ```avg```, ```min```, ```max```, and ```sum```. Despite its name, ```sum``` uses the SQLite function ```total``` to determine the results.

All of these functions take three arguments:

```where```: the where clause

```column```: the column to aggregate. This is optional for ```count```.

```distinct```: the same as ```column``` but it aggregates by distinct values.

```js
const count = await db.fighters.count({
  where: {
    hometown: 'Brisbane, Australia'
  }
});
```

There is also an ```exists``` function that takes one argument representing the where clause.

```js
const exists = await db.fighters.exists({ name: 'Israel Adesanya' });
```

### GroupBy

You can write ```group by``` statements like this:

```js
const towns = await db.fighters
  .groupBy('hometown')
  .avg({
    column: {
      height: 'heightCm'
    },
    where: {
      avg: c => c.gt(170)
    },
    limit: 3
  });
```

An aggregate function should come after the ```groupBy``` method. ```distinct``` can be used instead of ```column``` to aggregate by distinct values. ```distinct``` or ```column``` needs to be an object with a single property representing the alias for the aggregrate function, and the column to aggregate by.

In addition to aggregate functions such as ```avg``` or ```count```, there is also an ```array``` function that simply groups the rows into an array. The ```select``` option takes an object with a single property representing the name of the resulting array, and the column or columns to select.

```js
const groupValues = await db.events
  .groupBy('locationId')
  .array({
    select: {
      startTimes: 'startTime'
    },
    limit: 3
  });
```

### Computed fields

All of the functions built into SQLite, such as ```concat```, ```round```, and ```substring``` can be used to create fields that are computed inside the database and can therefore be used in all of the clauses, such as ```orderBy``` or ```where```.

```js
db.fighters.compute({
  displayName: (c, f) => f.concat(c.name, ' (', c.nickname, ')'),
  instagram: c => c.social.instagram
});
```

The ```instagram``` example nagivates a JSON type to extract a specific field. You can then use these fields in the rest of the API in exactly the same way as you do with standard columns.

```js
const orderBy = await db.fighters.query({
  select: 'instagram',
  where: {
    and: [
      { id: c => c.gt(100) },
      { id: c => c.lt(120) },
      { instagram: c => c.not(null) }
    ]
  },
  orderBy: (c, f) => f.lower(c.instagram)
});
```

Computed fields are not automatically included in results and have to be specifically selected. They should be defined in the ```db.js``` file.

### Remove

```remove``` takes one argument representing the where clause and returns the number of rows affected by the query.

```js
const changes = await db.fighters.remove({ id: 100 });
```

## Transactions

Transactions involve locking writes to the database with ```getTransaction```. If multiple transactions try to run at the same time, they will wait until the current transaction is complete.

```js
import { db } from './db.js';

const tx = await db.getTransaction();
try {
  await tx.begin();
  const coachId = await tx.coaches.insert({
    name: 'Eugene Bareman',
    city: 'Auckland'
  });
  const fighterId = await tx.fighters.get({ name: c => c.like('Israel%') }, 'id');
  await tx.fighterCoaches.insert({
    fighterId,
    coachId
  });
  await tx.commit();
}
catch (e) {
  await tx.rollback();
}
```

## Batches

You can also run multiple statements inside a single transaction without any logic using ```batch```.

```ts
const projectId = 1;
const [project, tags, issues] = await db.batch((bx) => [
  bx.projects.get({ id: projectId }),
  bx.tags.many({ projectId }),
  bx.issues.many({ projectId })
]);

const result = { ...project, tags, issues };
```

## Migrations

Tables are defined in ```./database/sql/tables.sql```. You can add or change tables from here and then run the migration command ```npm run migrate <migration-name>```.

If you want to reset the migration system to a new database that already has tables created on it, edit the ```tables.sql``` file and then run ```npm run reset```.

If you want to add a new column to a table without needing to drop the table, make sure you put the column at the end of the list of columns.

## Creating tables

Tables are created the same way as they are in SQL. The native types available in strict mode are ```integer```, ```real```, ```text```, ```blob```, and ```any```. In addition to these types, four additional types are included by default: ```boolean```, ```date```, and ```json```. ```boolean``` is a column in which the values are restricted to 1 or 0, ```date``` is a JavaScript ```Date``` stored as an ISO8601 string, and ```json``` is ```jsonb``` stored as a blob. These additional types are automatically parsed by the ORM.

```sql
create table events (
    id integer primary key,
    name text not null,
    startTime date not null,
    locationId integer references locations
);
```

## Default values

Default values can be set for boolean and date columns using the following syntax:

```sql
create table users (
  id integer primary key,
  isDisabled boolean not null default false,
  createdAt date not null default now()
);
```

```current_timestamp``` will not work properly when wanting to set the default date to the current time. This is because ```current_timestamp``` does not include timezone information and therefore when parsing the date string from the database, JavaScript will assume it is in local time when it is in fact in UTC time.

## Creating SQL queries

When the API doesn't do what you need it to do, you can create SQL queries. You can do this by creating a folder with the same name as the table, such as ```./database/sql/users```. You can then put SQL files in this folder that will be available in the API.

For example, if you create a query in ```./database/sql/users/roles.sql``` that looks like this:

```sql
select
    u.id,
    u.name,
    json_group_array(r.name) as roles
from
    users u join
    userRoles ur on ur.userId = u.id join
    roles r on ur.roleId = r.id
where 
    u.name = $name
group by 
    u.id
```

A function ```db.users.roles``` will be available in the API with the correct types.

![auto-completed code](hero.png)

When creating SQL queries, make sure you give an alias to any columns in the select statement that don't have a name. For example, do not do:

```sql
select max(startTime) from events;
```

as there is no name given to ```max(startTime)```.

Parameters in SQL files should use the ```$name``` notation. Single quotes in strings should be escaped with ```\```.

## Views

Views are treated like read-only tables. If you want to create a view called ```activeUsers```, you can add a file in the ```views``` folder called ```./database/views/activeUsers.sql``` that might have SQL like this:

```sql
create view activeUsers as
select * from users where isActive = true;
```

You can now use it in the API like this:

```js
import { db } from './database/db.js';

const user = await db.activeUsers.get({ id: 100 }, ['name', 'email']);
console.log(user.email);
```

## SQL queries in JavaScript

You can create queries programmatically inside JavaScript.

```js
const cards = db.subquery(c => {
  const {
    id,
    eventId,
    count
  } = c.cards;
  return {
    select: {
      eventId,
      count: c.count()
    },
    groupBy: eventId
  }
});
const events = await db.query(c => {
  const {
    locations: l,
    events: e
  } = c;
  const ca = context.use(cards);
  const nameLength = c.length(e.name);
  const join = [
    [e.locationId, l.id],
    [e.id, ca.eventId]
  ];
  return {
    select: {
      ...e,
      location: l.name,
      cards: ca.count,
      nameLength,
    },
    join,
    where: {
      [nameLength]: c.gt(20)
    }
  }
});
```

The object returned from the ```query``` and ```subquery``` methods can include the following:

```select```, ```optional```, ```where```, ```groupBy```, ```having```, ```orderBy```, ```desc```, ```limit```, and ```offset```.

```optional```: the same as ```select``` but provides hints to TypeScript that these columns may be ```null```. This is useful for columns that come from a left join.

```join```: a tuple or array of tuples representing the keys to join on. For a left or right join, you can use:

```js
const join = [f.id, n.fighterId, 'left'];
```

## JSON support

Flyweight can sample columns that are declared with the ```json``` type to create richer type information.

To sample your local database, run ```npm run sample```.
