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

## How it works

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

Every time you want to create an array within an object (such as the ```cards``` array in the main object), you include a primary key. Every column including and after the primary key forms the keys of the objects inside the array. Flyweight takes the name of the column (eg ```cardId```), removes the ```Id``` part, and then converts the name into its plural form to create the name of the array (eg ```cards```).

If you didn't want to create a ```cards``` array but wanted to include the ```cardId```, you would just select ```f.cardId```, which is a foreign key on the ```fights``` table rather than a primary key.

If you wanted to create a nested object inside an object (such as the ```red``` and ```blue``` in this example), you select a foreign key (such as ```blueId```) and then give any other columns after ```blueId``` the same prefix (```blue```), and they will be included in the object with the prefix removed.

The ```social``` property is an object because in the ```fighters``` table, it is defined with the type ```json```, which is automatically parsed into an object.

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
  tables: '/path/initial.sql',
  types: '/path/db.d.ts',
  extensions: '/path/regexp.dylib'
});

const db = result.db;
const makeTypes = result.makeTypes;
const getTables = result.getTables;

export {
  database,
  db,
  makeTypes,
  getTables
}
```

After you have done this:
1. create the ```initial.sql``` and add some tables.
2. create a new JavaScript file and import the ```makeTypes``` function, and then run it without any arguments as:

```js
await makeTypes();
```

or as 

```js
await makeTypes({ watch: true });
``` 

if you want it to stay open and run every time a SQL file is changed. This should create a ```db.d.ts``` file that will type the exported ```db``` variable.

For TypeScript, create a file with the following code:

```ts
import Database from 'flyweightjs';
import { TypedDb } from './types.ts';

const database = new Database();

const result = await database.initialize<TypedDb>({
  db: '/path/test.db',
  sql: '/path/sql',
  tables: '/path/initial.sql',
  types: '/path/types.ts',
  extensions: '/path/regexp.dylib'
});

const db = result.db;
const makeTypes = result.makeTypes;
const getTables = result.getTables;

export {
  database,
  db,
  makeTypes,
  getTables
}
```

When you first run this code, remove all of the references to ```TypedDb``` because it does not exist yet. Import ```makeTypes``` into another file and run to generate the ```types.ts``` file and then put the ```TypedDb``` references back. Before you do that though, you need to add some ```create table``` statements to the file specified in the ```tables``` argument so that there are some types to generate.

The ```initialize``` method's ```path``` object has the following properties:

```db```: The path to the database.

```sql```: A path to a folder for storing SQL files.

```tables```: A path to a SQL file containing the ```create table``` statements that define your database schema. This file should be placed in the root of the ```sql``` path.

```types```: If you are using JavaScript, this should be a path to a file that is in the same location as ```db.js```. If you are using TypeScript, this can be any path. This file should not exist yet. It will be created by the ```makeTypes``` function.

```extensions```: A string or array of strings of SQLite extensions that will be loaded each time a connection is made to the database.

```initialize``` also takes an optional second argument, ```interfaceName```, which is a string that can be used instead of ```TypedDb```. This is useful if you have more than one database.

## Compiling extensions

Flyweight supports regular expressions in some of its methods if you have loaded a regular expression extension. The SQLite website contains instructions for compiling extensions. It is missing some steps though. To compile the regexp.c extension included in the SQLite source code, you should do the following:

1. Download regexp.c from the SQLite repository
2. Download the SQLite amalgamation file from the SQLite website and unzip it into a folder
3. Put the regexp.c file into this folder and then run the commands mentioned at https://www.sqlite.org/loadext.html under the heading "Compiling a Loadable Extension" depending on your operating system

## Creating tables

Tables are created the same way as they are in SQL. Flyweight converts the custom types in these tables to native types, and converts the tables to strict mode. The native types available in strict mode are ```integer```, ```real```, ```text```, ```blob```, and ```any```. In addition to these types, four custom types are included by default: ```boolean```, ```date```, ```json```, and ```regexp```. ```boolean``` is a column in which the values are restricted to 1 or 0, ```date``` is a JavaScript ```Date``` in milliseconds, ```json``` is json stored as text, and ```regexp``` is mostly just used for querying.

To add your own types, you can use the ```registerTypes``` method on the ```database``` object mentioned earlier. ```registerTypes``` takes an array of ```CustomType``` objects that have the following properties:

```name```: the name of the type to be used in ```create table``` statements

```valueTest```: a function that takes a value and returns ```true``` or ```false``` as to whether they value's type is that of the custom type

```makeConstraint```: an optional function that takes a column name as an argument, and returns a SQL constraint string

```dbToJs```: a function that takes a value from the database and returns the JavaScript equivalent of that value

```jsToDb```: a function that takes a JavaScript value and returns a value suitable for storing in the database

```tsType```: the TypeScript type that represents this custom type

```dbType```: the native database type that will be used to store values of this type

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

Once you have created your tables, you can run the ```getTables``` function mentioned earlier with no arguments to convert the tables into a form that can be run by the database to create the tables. ```getTables``` returns a string of SQL.

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

## The API

Flyweight parses all of your SQL files and generates an API using TypeScript. In the "Getting started" section, you export a variable named ```db```. This is the API, and its properties include both the singular and plural form of every table in your database, as well as ```begin```, ```commit```, and ```rollback``` methods for transactions. Here is an example of a transaction:

```js
import { db } from './db.js';

try {
  await db.begin();

  const coachId = await db.coach.insert({
    name: 'Eugene Bareman',
    city: 'Auckland'
  });
  const fighterId = await db.fighter.get({ name: /Israel/ }, 'id');
  await db.fighterCoach.insert({
    fighterId,
    coachId
  });
  
  await db.commit();
}
catch (e) {
  console.log(e);
  await db.rollback();
}
```

Every table has ```get```, ```update```, ```insert```, and ```remove``` methods available to it, along with any of the custom methods that are created when you add a new SQL file to the corresponding table's folder.

### Insert

```insert``` simply takes one argument - ```params```, with the keys and values corresponding to the column names and values you want to insert. It returns the primary key if none was supplied, otherwise it returns the number of rows affected by the query.

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

All of the arguments are passed in as parameters for security reasons. There are no limits to the amount of values used in the ```in``` clause, unlike other ORMs.

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
