with common as (
    select opponentId from opponents 
    where fighterId = $fighter1 and methodId is not null
    intersect
    select opponentId from opponents 
    where fighterId = $fighter2 and methodId is not null
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
    opponents o join
    fights f on o.fightId = f.id join
    fighters rf on f.redId = rf.id join
    fighters bf on f.blueId = bf.id join
    methods m on f.methodId = m.id join
    cards c on f.cardId = c.id join
    events e on c.eventId = e.id 
where 
    o.fighterId in ($fighter1, $fighter2) and 
    o.opponentId in (select opponentId from common)
order by o.opponentId

