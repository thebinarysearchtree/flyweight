select
    l.name,
    groupArray(e.name order by e.name desc) as events
from 
    locations l join
    events e on e.locationId = l.id
where l.id in (27, 28)
group by l.id;
