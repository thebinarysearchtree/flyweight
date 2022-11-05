with common as (
    select opponentId from opponents 
    where fighterId = $fighter1 and methodId is not null
    intersect
    select opponentId from opponents 
    where fighterId = $fighter2 and methodId is not null
)
select
    object(
        rf.id, 
        rf.name) as red,
    object(
        bf.id, 
        bf.name) as blue,
    f.winnerId,
    m.name as method,
    f.methodDescription as description,
    object(
        e.id, 
        e.name, 
        e.startTime as date) as event
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

