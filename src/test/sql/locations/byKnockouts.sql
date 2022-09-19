select
    l.id,
    l.name,
    count(distinct f.id) as knockouts
from
    locations l join
    events e on l.id = e.locationId join
    cards c on c.eventId = e.id join
    fights f on f.cardId = c.id
where
    f.methodId = 1
group by l.id
order by knockouts desc
