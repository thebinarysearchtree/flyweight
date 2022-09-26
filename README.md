# Flyweight
An ORM for SQLite and NodeJS. Flyweight is different from other ORMs in that it combines a very simple API for performing basic operations, with the ability to create SQL queries that are typed and automatically mapped to complex object types.

The problem with traditional ORMs is that they require you to learn an entirely new and complex abstraction that tries to mimic many of the features of SQL. Flyweight simply allows you to use SQL, without any extra mapping code.

The following examples are based on a hypothetical UFC database with the following structure:

A UFC event has a name, a location, and a start time. Each event has one or more cards (the main card, the preliminary cards). Each card has many fights. Each fight has a red corner and a blue corner, representing the two fighters.




