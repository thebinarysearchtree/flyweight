with dates as (
    select groupArray(startTime) as dates 
    from opponents
    where fighterId = $id
)
select f.name, d.dates 
from fighters f join dates d
where id = $id
