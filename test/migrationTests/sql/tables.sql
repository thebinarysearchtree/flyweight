create table users (
    id integer primary key,
    name text not null,
    age integer not null
);

create table roles (
    id integer primary key,
    name text not null
);

create table userRoles (
    id integer primary key,
    userId integer not null references users,
    roleId integer not null references roles
);

create index userRolesIndex on userRoles(userId, roleId);
