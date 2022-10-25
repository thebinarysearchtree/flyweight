select
    l.id,
    l.name,
    e.id as eventId,
    e.name as eventName,
    e.startTime
from
    locations l join
    events e on e.locationId = l.id
where l.id > 240
