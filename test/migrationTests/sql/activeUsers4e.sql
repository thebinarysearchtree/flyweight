create view activeUsers as
select 
    id,
    name,
    age,
    isActive from users where isActive = true;