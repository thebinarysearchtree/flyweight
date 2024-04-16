drop view activeUsers;

alter table users add column email text;

create view activeUsers as
select 
    id,
    name,
    age,
    isActive,
    email from users where isActive = true;