# Flyweight
An ORM for SQLite and NodeJS. Flyweight combines a very simple API for performing basic operations, with the ability to create SQL queries that are typed and automatically mapped to complex object types.

For example, if you create a file called ```roles.sql``` that looks like this:

```sql
select
    u.id,
    u.name,
    groupArray(r.name) as roles
from
    users u join 
    roles r on r.userId = u.id
where u.name = $name
group by u.id
```

A function ```db.users.roles``` will be available in the API that has the correct TypeScript types.

![auto-completed code](hero.png)

Tables are created with SQL, not with a custom API.

```sql
create table events (
    id integer primary key,
    name text not null,
    startTime date not null,
    locationId integer references locations
);
```

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

For example, if you have a query contained in a file called ```getById.sql``` in the ```events``` folder, it can be called from the API like this:

```js
const event = await db.event.getById({ id: 100 });
```

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

## Getting started

```
npm install flyweightjs
```

For JavaScript, create a file called db.js with the following code:

```js
import { Database } from 'flyweightjs';

const database = new Database();

const result = await database.initialize({
  db: '/path/test.db',
  sql: '/path/sql',
  tables: '/path/tables.sql',
  views: '/path/views',
  types: '/path/db.d.ts',
  migrations: '/path/migrations'
});

const {
  db,
  makeTypes,
  getTables,
  createMigration,
  runMigration
} = result;

export {
  database,
  db,
  makeTypes,
  getTables,
  createMigration,
  runMigration
}
```

After you have done this:
1. create the ```tables.sql``` and add some tables.
2. create a new JavaScript file and import the ```makeTypes``` function, and then run it without any arguments as:

```js
await makeTypes();
```

This should create a ```db.d.ts``` file that will type the exported ```db``` variable.

The ```initialize``` method's ```path``` object has the following properties:

```db```: The path to the database.

```sql```: A path to a folder for storing SQL files.

```tables```: A path to a SQL file or folder of files containing the ```create table``` and ```create index``` statements that define your database schema.

```views```: A path to a SQL file or folder of files containing any ```create view``` statements that you have. This is optional.

```types```: This should be a path to a file that is in the same location as ```db.js```. This file should not exist yet. It will be created by the ```makeTypes``` function.

```migrations```: A path to the migrations folder. When you run ```createMigration```, the SQL files will be created in this folder.

```extensions```: A string or array of strings of SQLite extensions that will be loaded each time a connection is made to the database.

## Regular expressions

Flyweight supports regular expressions in some of its methods. These regular expressions are converted to ```like``` statements, which limits what kind of regular expressions you can make.

```js
const coach = await db.coach.get({ name: /^Eugene.+/ });
```

## Creating tables

Tables are created the same way as they are in SQL. The native types available in strict mode are ```integer```, ```real```, ```text```, ```blob```, and ```any```. In addition to these types, four additional types are included by default: ```boolean```, ```date```, and ```json```. ```boolean``` is a column in which the values are restricted to 1 or 0, ```date``` is a JavaScript ```Date``` stored as an ISO8601 string, and ```json``` is json stored as text.

Default values can be set for boolean and date columns using the following syntax:

```sql
create table users (
  id integer primary key,
  isDisabled boolean not null default false,
  createdAt date not null default now()
);
```

```current_timestamp``` will not work properly when wanting to set the default date to the current time. This is because ```current_timestamp``` does not include timezone information and therefore when parsing the date string from the database, JavaScript will assume it is in local time when it is in fact in UTC time.

You can use the migration tools mentioned later on to convert the tables into a form that SQLite recognises.

## Creating SQL queries

In the SQL folder you supplied to the ```initialize``` method, you should create folders with the same name as your table names, and then put SQL files in the folders that correspond to the name of the method you want to call to run them. For example, if you wanted a query that was called like this:

```js
const event = await db.event.getById({ id: 100 });
```

you would create an ```events``` folder and put a file in it called ```getById.sql```.

When creating SQL queries, make sure you give an alias to any columns in the select statement that don't have a name. For exampe, do not do:

```sql
select max(startTime) from events;
```

as there is no name given to ```max(startTime)```.

Parameters in SQL files should use the ```$name``` notation. If you want to include dynamic content, you should use the ```${column}``` format and then pass in a second argument when calling the SQL statement in JavaScript. For example:

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

This is useful when the query is determined at run-time. You are responsible for making sure the unsafe parameters do not cause any security issues as they are interpolated into the SQL statement rather than passed as parameters.

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

## The API

Flyweight parses all of your SQL files and generates an API using TypeScript. In the "Getting started" section, you export a variable named ```db```. This is the API, and its properties include both the singular and plural form of every table in your database.

Every table has ```get```, ```update```, ```insert```, and ```remove``` methods available to it, along with any of the custom methods that are created when you add a new SQL file to the corresponding table's folder. Views only have the ```get``` method available to them.

### Insert

```insert``` simply takes one argument - ```params```, with the keys and values corresponding to the column names and values you want to insert. It returns the primary key, or part of the primary key if the table has a composite primary key. The plural version of ```insert``` is for batch inserts and takes an array of ```params```. It doesn't return anything.

### Update

```update``` takes two arguments - the ```query``` (or null), and the ```params``` you want to update. It returns a number representing the number of rows that were affected by the query. For example:

```js
await db.coach.update({ id: 100 }, { city: 'Brisbane' });
```

which corresponds to

```sql
update coaches set city = 'Brisbane' where id = 100;
```

### Get

```get``` takes two optional arguments. The first is ```params``` - an object representing the where clause. For example:

```js
const fights = await db.fights.get({ cardId: 9, titleFight: true });
```

translates to

```sql
select * from fights where cardId = 9 and titleFight = 1;
```

The keys to ```params``` must be the column names of the table. The values can either be of the same type as the column, an array of values that are the same type as the column, null, or a regular expression if the column is text. If an array is passed in, an ```in``` clause is used, such as:

```js
const fights = await db.fights.get({ cardId: [1, 2, 3] });
```

which translates to

```sql
select * from fights where cardId in (1, 2, 3);
```

If null is passed in as the value, the SQL will use ```is null```. If a regular expression is passed in, the SQL will use ```like```.

All of the arguments are passed in as parameters for security reasons.

The second argument to ```get``` can be one of three possible values:

1. a string representing a column to select. In this case, the result returned is a single value or array of single values, depending on whether a plural or singular table name is used in the query.
2. an array of strings, representing the columns to select.
3. An object with one or more of the following properties:

```select``` or ```exclude```: ```select``` can be a string or array representing the columns to select. ```exclude``` can be an array of columns to exclude, with all of the other columns being selected.

```orderBy```: a string representing the column to order the result by, or an array of columns to order the result by.

```desc```: set to true when using ```orderBy``` if you want the results in descending order.

```limit``` and ```offset```: corresponding to the SQL keywords with the same name.

```distinct```: adds the ```distinct``` keywords to the start of the select clause.

For example:

```js
const fighters = await db.fighters.get({ isActive: true }, {
  select: ['name', 'hometown'],
  orderBy: 'reachCm',
  limit: 10
});
```

While the default interpretation of the query parameters is ```=```, you can modify the meaning by importing ```not```, ```gt```, ```gte```, ```lt```, and ```lte```.

For example:

```js
import { not } from 'flyweightjs';

const excluded = [1, 2, 3];
const users = await db.users.get({ id: not(excluded) });
```

### Exists and Count

These functions take one argument representing the where clause.

```js
const count = await db.fighters.count({ hometown: 'Brisbane, Australia' });
const exists = await db.fighter.exists({ name: 'Israel Adesanya' });
```


### Remove

```remove``` takes one argument representing the where clause and returns the number of rows affected by the query.

```js
const changes = await db.fighters.remove({ id: 100 });
```

## Transactions and concurrency

Transactions involve taking a connection from a pool of connections by calling ```getTransaction```. Once you have finished using the transaction, you should call ```release``` to return the connection to the pool. If there are a large number of simultaneous transactions, the connection pool will be empty and ```getTransaction``` will start to wait until a connection is returned to the pool.

```js
import { db } from './db.js';

try {
  const tx = await db.getTransaction();
  await tx.begin();

  const coachId = await tx.coach.insert({
    name: 'Eugene Bareman',
    city: 'Auckland'
  });
  const fighterId = await tx.fighter.get({ name: /Israel/ }, 'id');
  await tx.fighterCoach.insert({
    fighterId,
    coachId
  });
  
  await tx.commit();
}
catch (e) {
  console.log(e);
  await tx.rollback();
}
finally {
  db.release(tx);
}
```

## Migrations

The ```initialize``` method mentioned earlier returns two functions related to performing migrations: ```createMigration``` and ```runMigration```. They both take one argument: ```name```. When ```createMigration``` is run, it will create a file in the ```migrations``` directory with the format ```name.sql```. You can import the ```createMigration``` function into a new file like this:

```js
import { createMigration } from './db.js';

await createMigration(process.argv[2]);
```

and run it from the command line like this:

```
node migrate.js <migrationName>
```

replacing ```migrationName``` with the name you want to call your migration.

The SQL created by the migration may need adjusting, so make sure you check the file before you apply it to the database. If you want to add a new column to a table without needing to drop the table, make sure you put the column at the end of the list of columns.

```runMigration``` can be used the same way. It reads the migration file created by ```createMigration```, turns off foreign keys, begins a transaction, runs the migration, and then turns foreign keys back on.

## Running tests

To run the tests, first go into the ```test``` folder and run ```node setup.js``` to move the test database to the right location. You can then run the tests with ```node test.js``` or ```npm test```.
