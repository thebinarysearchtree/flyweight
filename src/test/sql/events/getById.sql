select
    e.id as eventId,
    e.name as eventName,
    c.id as cardId,
    c.cardName,
    f.id as fightId,
    bf.id as blueId,
    bf.name as blueName,
    bf.social as blueSocialJson,
    rf.id as redId,
    rf.name as redName,
    rf.social as redSocialJson
from
    events e join
    cards c on c.eventId = e.id join
    fights f on f.cardId = c.id join
    fighters bf on f.blueId = bf.id join
    fighters rf on f.redId = rf.id
where e.id = 100
