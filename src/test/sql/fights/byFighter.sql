select
    o.name as opponent,
    f.winnerId = $id as win,
    f.winnerId,
    m.name as method,
    f.methodDescription,
    e.name as eventName,
    e.startTime,
    f.endRound,
    f.endSeconds,
    f.titleFight,
    l.name
from
    fights f join
    fighters o on case when f.redId = $id then f.blueId = o.id else f.redId = o.id end join
    fighters bf on f.blueId = bf.id join
    methods m on f.methodId = m.id join
    cards c on f.cardId = c.id join
    events e on c.eventId = e.id join
    locations l on e.locationId = l.id
where f.blueId = $id or f.redId = $id
order by e.startTime desc
    