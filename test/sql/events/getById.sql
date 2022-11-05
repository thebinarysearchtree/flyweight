select
    e.id,
    e.name as eventName,
    c.id as cardId,
    c.cardName,
    f.id as fightId,
    object(
        bf.id, 
        bf.name, 
        bf.social) as blue,
    object(
        rf.id, 
        rf.name, 
        rf.social) as red
from
    events e join
    cards c on c.eventId = e.id join
    fights f on f.cardId = c.id join
    fighters bf on f.blueId = bf.id join
    fighters rf on f.redId = rf.id
where e.id = $id
