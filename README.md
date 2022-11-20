# Flyweight
An ORM for SQLite and NodeJS. Flyweight combines a very simple API for performing basic operations, with the ability to create SQL queries that are typed and automatically mapped to complex object types.

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
    e.id,
    e.name,
    c.id as cardId,
    c.cardName,
    f.id as fightId,
    object(
        bf.id, 
        bf.name, 
        bf.social) as blue,
    object(
        rf.id, 
        rf.name, 
        rf.social) as red
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
    { id: 247, cardName: 'Main card', fights: [Array] },
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

## How it works

Now let's look at how Flyweight does this without you having to specify any mapping code. It all comes down to the select statement:

```sql
  e.id,                     // primary key
  e.name,
  c.id as cardId,           // primary key
  c.cardName,
  f.id as fightId,          // primary key
  object(
        bf.id, 
        bf.name, 
        bf.social) as blue,
  object(
      rf.id, 
      rf.name, 
      rf.social) as red
```

Every time you want to create an array within an object (such as the ```cards``` array in the main object), you include a primary key. Every column including and after the primary key forms the keys of the objects inside the array. Flyweight takes the name of the column (eg ```cardId```), removes the ```Id``` part, and then converts the name into its plural form to create the name of the array (eg ```cards```). If the column name doesn't fit this format, Flyweight just uses the name of the table the primary key is from as the array name.

```sql
object(
    bf.id, 
    bf.name, 
    bf.social) as blue
``` 

is just shorthand for 

```sql
json_object(
    'id', bf.id, 
    'name', bf.name, 
    'social', bf.social) as blue
```

Other commands available are ```groupArray``` which is shorthand for ```json_group_array```, and ```array```, which is shorthand for ```json_array```.

These functions can also be used like this:

```sql
select
    l.id,
    groupArray(e.*) as events
from
    locations l join
    events e on e.locationId = l.id
group by l.id
```

```sql
select object(*) as method from methods
```

The ```social``` property is an object because in the ```fighters``` table, it is defined with the type ```json```, which is automatically parsed into an object.

When writing SQL that is mapped to nested arrays, you don't have to worry about avoiding name clashes. For example,

```sql
select l.*, e.* 
from 
    locations l join 
    events e on e.locationId = l.id
```

will work even though ```locations``` and ```events``` both have an ```id``` and ```name``` property. Flyweight automatically renames columns that clash, and then returns them to their original name during the mapping stage. As this query returns an array of locations that each contain an array of events, the ```id``` and ```name``` properties no longer clash.

## Getting started

```
npm install flyweightjs
```

For JavaScript, create a file called db.js with the following code:

```js
import Database from 'flyweightjs';

const database = new Database();

const result = await database.initialize({
  db: '/path/test.db',
  sql: '/path/sql',
  tables: '/path/tables.sql',
  views: '/path/views',
  types: '/path/db.d.ts',
  migrations: '/path/migrations',
  extensions: '/path/regexp.dylib',
  interfaces: '/path/interfaces.d.ts'
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

For TypeScript, create a file with the following code:

```ts
import Database from 'flyweightjs';
import { TypedDb } from './types.ts';

const database = new Database();

const result = await database.initialize<TypedDb>({
  db: '/path/test.db',
  sql: '/path/sql',
  tables: '/path/tables.sql',
  views: '/path/views',
  types: '/path/types.ts',
  migrations: '/path/migrations',
  extensions: '/path/regexp.dylib',
  interfaces: '/path/interfaces.d.ts'
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

When you first run this code, remove all of the references to ```TypedDb``` because it does not exist yet. Import ```makeTypes``` into another file and run to generate the ```types.ts``` file and then put the ```TypedDb``` references back. Before you do that though, you need to add some ```create table``` statements to the file specified in the ```tables``` argument so that there are some types to generate.

The ```initialize``` method's ```path``` object has the following properties:

```db```: The path to the database.

```sql```: A path to a folder for storing SQL files.

```tables```: A path to a SQL file or folder of files containing the ```create table``` and ```create index``` statements that define your database schema.

```views```: A path to a SQL file or folder of files containing any ```create view``` statements that you have. This is optional.

```types```: If you are using JavaScript, this should be a path to a file that is in the same location as ```db.js```. If you are using TypeScript, this can be any path. This file should not exist yet. It will be created by the ```makeTypes``` function.

```migrations```: A path to the migrations folder. When you run ```createMigration```, the SQL files will be created in this folder.

```extensions```: A string or array of strings of SQLite extensions that will be loaded each time a connection is made to the database.

```interfaces```: A path to a TypeScript declaration file that can be used to easily type JSON columns.

```initialize``` also takes an optional second argument, ```interfaceName```, which is a string that can be used instead of ```TypedDb```. This is useful if you have more than one database.

## Regular expressions

Flyweight supports regular expressions in some of its methods. To enable this functionality, there is a ```pcre2.js``` file located in ```node_modules/flyweightjs/extensions```. You can run this with ```node pcre2.js``` and it will generate a ```pcre2.so``` or ```pcre2.dylib``` file depending on your operating system. You should then copy this file to the location where you keep your extensions.

The regular expression software used by this extension is PCRE2 10.40. You can even use ```i```, ```m```, and ```s``` flags in your regular expressions. Unicode is on by default, whether or not you pass it in as a flag.

```js
const coach = await db.coach.get({ city: /\p{Script=Greek}+/ });
```

When wanting to using regular expressions in SQL, you should write them more like PCRE2 regular expressions than JavaScript regular expressions.

```sql
select * from coaches where city regexp '\p{Greek}+';
```

## Creating tables

Tables are created the same way as they are in SQL. Flyweight converts the custom types in these tables to native types, and converts the tables to strict mode. The native types available in strict mode are ```integer```, ```real```, ```text```, ```blob```, and ```any```. In addition to these types, four custom types are included by default: ```boolean```, ```date```, ```json```, and ```regexp```. ```boolean``` is a column in which the values are restricted to 1 or 0, ```date``` is a JavaScript ```Date``` stored as an ISO8601 string, ```json``` is json stored as text, and ```regexp``` is mostly just used for querying.

To add your own types, you can use the ```registerTypes``` method on the ```database``` object mentioned earlier. ```registerTypes``` takes an array of ```CustomType``` objects that have the following properties:

```name```: the name of the type to be used in ```create table``` statements.

```valueTest```: a function that takes a value and returns ```true``` or ```false``` as to whether they value's type is that of the custom type.

```makeConstraint```: a function that takes a column name as an argument, and returns a SQL constraint string.

```dbToJs```: a function that takes a value from the database and returns the JavaScript equivalent of that value. The null case does not need to be handled as it is passed through unchanged.

```jsToDb```: a function that takes a JavaScript value and returns a value suitable for storing in the database. The null case does not need to be handled as it is passed through unchanged.

```tsType```: the TypeScript type that represents this custom type.

```dbType```: the native database type that will be used to store values of this type.

For example, the custom type for ```boolean``` is as follows:

```js
{
  name: 'boolean',
  valueTest: (v) => typeof v === 'boolean',
  makeConstraint: (column) => `check (${column} in (0, 1))`,
  dbToJs: (v) => Boolean(v),
  jsToDb: (v) => v === true ? 1 : 0,
  tsType: 'boolean',
  dbType: 'integer'
}
```

```valueTest``` and ```jsToDb``` are only necessary if a conversion is required from a JavaScript type to a native database type. ```dbToJs``` is only required if a conversion is necessary when taking data out of the database. If no conversion is necessary either way, your custom type will look something like this:

```js
{
  name: 'medal',
  makeConstraint: (column) => `check (${column} in ('gold', 'silver', 'bronze'))`,
  tsType: 'string',
  dbType: 'text'
}
```

You can also easily type JSON columns by passing in an ```interfaces.d.ts``` file to the ```initialize``` method mentioned in the getting started section. For example, if your ```interfaces.d.ts``` file looks like this:

```ts
export interface Social {
  instagram?: string;
  twitter?: string;
}
```

and you have a table that looks like this:

```sql
create table fighters (
    id integer primary key,
    name text not null,
    nickname text,
    born text,
    heightCm integer,
    reachCm integer,
    hometown text not null,
    social,
    isActive boolean not null
);
```

The ```social``` column is typed with the ```Social``` type. This is because any column without a type is assumed to have the type name of the column, and any type that hasn't been registered as a custom type is assumed to be of the type ```json``` if it matches the lowercase name of one of the interfaces defined in the ```interfaces.d.ts```.

Once you have created your tables, you can run the ```getTables``` function mentioned earlier with no arguments to convert the tables into a form that can be run by the database to create the tables. ```getTables``` returns a string of SQL. You can also just use the migration tools mentioned later on, as the first migration will include everything in your ```tables.sql```.

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

Parameters in SQL files should use the ```$name``` notation. Single quotes in strings should be escaped with ```\```. JSON functions are automatically typed and parsed. For example, the following:

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

Nulls are automatically removed from all ```groupArray``` results. If ```groupArray``` is used with a single value, and that value is a number, string, or date, the resulting array will be sorted in order, depending on the type. Dates are sorted in descending order, numbers and strings are sorted in ascending order.

When all of the properties of ```object``` are from a left or right join, and there are no matches from that table, instead of returning, for example:

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

If null is passed in as the value, the SQL will use ```is null```. If a regular expression is passed in, the SQL will use ```regexp```.

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

To run the tests, first go into the ```test``` folder and run ```node setup.js``` to move the test database to the right location and create the PCRE2 extension. You can then run the tests with ```node test.js``` or ```npm test```.
