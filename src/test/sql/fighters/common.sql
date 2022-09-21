with opponents as (
    select case when blueId = $fighter1 then redId else blueId end as id
    from fights where $fighter1 in (redId, blueId) and methodId not null
    intersect
    select case when blueId = $fighter2 then redId else blueId end as id
    from fights where $fighter2 in (redId, blueId) and methodId not null
)
select
    f.redId,
    rf.name as redName,
    f.blueId,
    bf.name as blueName,
    f.winnerId,
    m.name as method,
    f.methodDescription as description,
    c.eventId,
    e.name as eventName,
    e.startTime as eventDate
from 
    fights f join
    fighters rf on f.redId = rf.id join
    fighters bf on f.blueId = bf.id join
    methods m on f.methodId = m.id join
    cards c on f.cardId = c.id join
    events e on c.eventId = e.id 
where 
    (blueId in ($fighter1, $fighter2) or redId in ($fighter1, $fighter2)) and
    (blueId in (select id from opponents) or redId in (select id from opponents))
order by case when redId in ($fighter1, $fighter2) then blueId else redId end

