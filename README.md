# Flyweight
Flyweight is a NodeJS and edge ORM for databases that are compatible with SQLite.

Other ORMS try to create an abstraction that covers as many of the features of SQL as possible, while leaving you with no support when you drop down into SQL itself. Flyweight takes a different approach by providing a very simple API for basic functions, such as the following:

```js
const fights = await db.fights.many({ cardId: [1, 2, 3] });
```

while providing types, autocomplete, and other features for the results of SQL queries by being able to understand the queries themselves.

For example, if you create a query in ```./database/sql/users/roles.sql``` that looks like this:

```sql
select
    u.id,
    u.name,
    groupArray(r.name) as roles
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

## Shorthand JSON functions

```sql
object(
    u.id, 
    u.name, 
    u.social) as user
``` 

is just shorthand for 

```sql
json_object(
    'id', u.id, 
    'name', u.name, 
    'social', u.social) as user
```

Other commands available are ```groupArray``` which is shorthand for ```json_group_array```, and ```array```, which is shorthand for ```json_array```.

## Alias stars

Normally, SQLite doesn't support aliased stars, but this syntax is now available when writing SQL statements with Flyweight.

```sql
select
    e.*,
    l.name as locationName
from 
    events e join
    locations l on e.locationId = l.id
```

## Creating tables

Tables are created the same way as they are in SQL. The native types available in strict mode are ```integer```, ```real```, ```text```, ```blob```, and ```any```. In addition to these types, four additional types are included by default: ```boolean```, ```date```, and ```json```. ```boolean``` is a column in which the values are restricted to 1 or 0, ```date``` is a JavaScript ```Date``` stored as an ISO8601 string, and ```json``` is ```jsonb``` stored as a blob if the database supports it, otherwise it is text. These additional types are automatically parsed by the ORM.

```sql
create table events (
    id integer primary key,
    name text not null,
    startTime date not null,
    locationId integer references locations
);
```

If you want to get one row with the basic API, you can use:

```js
const event = await db.events.get({ id: 100 });
```

If you want to get many rows, you can use:

```js
const names = await db.events.many({ id: eventIds }, 'name');
```

If you want to insert a row, you can do:

```js
const id = await db.coaches.insert({
  name: 'Eugene Bareman',
  city: 'Auckland'
});
```

## Getting started

```
mkdir test
cd test
npm init
npx create-flyweight database
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

## Migrations

Tables are defined in ```./database/sql/tables.sql```. You can add or change tables from here and then run the migration command ```npm run migrate <migration-name>```.

If you want to reset the migration system to a new database that already has tables created on it, edit the ```tables.sql``` file and then run ```npm run reset```.

If you want to add a new column to a table without needing to drop the table, make sure you put the column at the end of the list of columns.

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

## The API

Every table has ```get```, ```many```, ```query```, ```update```, ```insert```, ```insertMany```, and ```remove``` methods available to it, along with any of the custom methods that are created when you add a new SQL file to the corresponding table's folder. Views only have the ```get```, ```many```, and ```query``` methods available to them.

### Insert

```insert``` simply takes one argument - ```params```, with the keys and values corresponding to the column names and values you want to insert. It returns the primary key, or part of the primary key if the table has a composite primary key. For batch inserts you can use ```insertMany``` and it takes an array of ```params```. It doesn't return anything.

### Update

```update``` takes two arguments - the ```query``` (or null), and the ```params``` you want to update. It returns a number representing the number of rows that were affected by the query. For example:

```js
await db.coaches.update({ id: 100 }, { city: 'Brisbane' });
```

which corresponds to

```sql
update coaches set city = 'Brisbane' where id = 100;
```

### Get

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

3. an array of strings or selector objects, representing the columns to select.

```js
const fighter = await db.fighters.get({ id: 3 }, ['id', 'born', { select: c => c.social.instagram, as: 'instagram' }]);
```

Alternatively, you can use the ```query``` syntax to access additional keywords. ```query``` returns an array in the same way as ```many```. The additional keywords are:

```orderBy```: a string representing the column to order the result by, or an array of columns to order the result by.

```desc```: set to true when using ```orderBy``` if you want the results in descending order.

```limit``` and ```offset```: corresponding to the SQL keywords with the same name.

```distinct```: adds the ```distinct``` keywords to the start of the select clause.

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

While the default interpretation of the query parameters is ```=```, you can pass in a function to use ```not```, ```gt```, ```gte```, ```lt```, ```lte```, ```like```, ```range```, ```match``` and ```glob```.

For example:

```js
const excluded = [1, 2, 3];
const users = await db.users.many({ id: i => i.not(excluded) });
const count = await db.users.count({ id: i => i.range({ gt: 10, lt: 15 }) });
```

### Exists and Count

These functions take one argument representing the where clause.

```js
const count = await db.fighters.count({ hometown: 'Brisbane, Australia' });
const exists = await db.fighters.exists({ name: 'Israel Adesanya' });
```

### Remove

```remove``` takes one argument representing the where clause and returns the number of rows affected by the query.

```js
const changes = await db.fighters.remove({ id: 100 });
```

## Creating SQL queries

When the basic API doesn't do what you need it to do, you can create SQL queries. You can do this by creating a folder with the same name as the table, such as ```./database/sql/users```. You can then put SQL files in this folder that will be available in the API.

When creating SQL queries, make sure you give an alias to any columns in the select statement that don't have a name. For example, do not do:

```sql
select max(startTime) from events;
```

as there is no name given to ```max(startTime)```.

Parameters in SQL files should use the ```$name``` notation. If you want to include dynamic content that cannot be parameterized, you should use the ```${column}``` format and then pass in a second argument when calling the SQL statement in JavaScript. For example:

```sql
select * from users where location = $location order by ${column};
```

```js
const options = {
  unsafe: {
    column: 'lastName'
  }
};
const users = await db.users.from({ location: 'Brisbane' }, options);
```

If the unsafe parameter is ```undefined``` in the options argument, it will be removed from the SQL statement.

Single quotes in strings should be escaped with ```\```. JSON functions are automatically typed and parsed. For example, the following:

```sql
select id, object(name, startTime) as nest from events;
```

will have the type:

```ts
interface EventQuery {
  id: number;
  nest: { name: string, startTime: Date }
}
```

Nulls are automatically removed from all ```groupArray``` results. When all of the properties of ```object``` are from a left or right join, and there are no matches from that table, instead of returning, for example:

```js
{ name: null, startTime: null }
```

the entire object will be null.

## Transactions and concurrency

Transactions involve locking writes with ```getTransaction```. If multiple transactions try to run at the same time, they will wait until the current transaction is complete.

```js
import { db } from './db.js';

try {
  const tx = await db.getTransaction();
  await tx.begin();

  const coachId = await tx.coaches.insert({
    name: 'Eugene Bareman',
    city: 'Auckland'
  });
  const fighterId = await tx.fighters.get({ name: n => n.like('Israel%') }, 'id');
  await tx.fighterCoaches.insert({
    fighterId,
    coachId
  });
  
  await tx.commit();
}
catch (e) {
  console.log(e);
  await tx.rollback();
}
```

## Views

Views are treated like read-only tables. They have a ```get``` and ```many``` method available to them that works the same as with tables. If you want to create a view called ```activeUsers``` you can add a file in the ```views``` folder called ```./database/views/activeUsers.sql``` that might have SQL like this:

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

## Cloudflare D1

Flyweight provides first-class support for D1. The only difference between the D1 API and the SQLite API is that D1 doesn't support transactions. Instead, there is a ```batch``` method available that can be used like this:

```ts
import createClient from './database/db';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const db = createClient(env.DB);

    const projectId = 1;
    const [project, tags, issues] = await db.batch((bx) => [
      bx.projects.get({ id: projectId }),
      bx.tags.many({ projectId }),
      bx.issues.many({ projectId })
    ]);

    return Response.json({
      ...project
      tags,
      issues
    });
  }
};
```

To get started, run this command in the root of your Cloudflare Workers project.

```
npx create-flyweight d1 src/database
```

If your database already has tables created on it, go into ```src/database/sql/tables.sql``` and add all of the ```create``` statements and then run:

```
npm run reset
```

to reset the migration system to the current state of the database. All migration commands work on the local version of the database and interface with the wrangler migration system so that you can run ```apply``` on the remote database yourself to add any migrations.

If you have more than one database and want to create a migration for a specific database, you can run:

```
npm run migrate dbName migrationName
```

You should run ```npm run watch``` to keep the ```src/database/files.js``` updated with any new sql files or table changes while you write the code.

## Turso

Turso uses the same npm commands as D1. Turso also supports the same transaction API that the standard SQLite database uses. The only difference is that the ```getTransaction``` function for Turso needs a type of either ```read``` or ```write```. It also supports the ```batch``` that D1 uses.

In the root directory of the project, you can install flyweight with

```
npx create-flyweight turso database
```

You will then need to edit the file in ```database/db.js``` to change the ```url``` and any other arguments you need. You will also want to change the import statement for turso to use the web version of the client if you are running in a edge-based environment.

You can then use it like this:

```ts
import createClient from './database/db';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const db = createClient();
    const users = await db.users.many();

    return Response.json(users);
  }
};
```



## Running tests

To run the tests, first go into the ```test``` folder and run ```node setup.js``` to move the test database to the right location. You can then run the tests with ```node test.js``` or ```npm test```.
