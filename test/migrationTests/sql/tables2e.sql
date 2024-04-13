create table roles (
    id integer primary key,
    name text not null
) strict;

create table userRoles (
    id integer primary key,
    userId integer not null references users,
    roleId integer not null references roles
) strict;

create index userRolesIndex on userRoles(userId, roleId);