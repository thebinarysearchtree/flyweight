select
    e.id as eventId,
    e.name as eventName,
    c.id as cardId,
    c.cardName,
    f.id as fightId,
    f.blueId,
    bf.name as blueName,
    bf.social as blueSocial,
    f.redId,
    rf.name as redName,
    rf.social as redSocial
from
    events e join
    cards c on c.eventId = e.id join
    fights f on f.cardId = c.id join
    fighters bf on f.blueId = bf.id join
    fighters rf on f.redId = rf.id
where e.id = 100
