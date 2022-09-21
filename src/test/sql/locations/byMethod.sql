select
    l.id,
    l.name,
    count(distinct f.id) as count
from
    locations l join
    events e on l.id = e.locationId join
    cards c on c.eventId = e.id join
    fights f on f.cardId = c.id
where
    f.methodId = $id
group by l.id
order by count desc
