create view activeUsers as
select * from users where isActive = true;
