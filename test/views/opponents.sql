create view opponents as
with eventFights as (
    select
        f.id as fightId,
        e.startTime as startTime,
        f.redId,
        f.blueId,
        f.methodId
    from
        fights f join
        cards c on f.cardId = c.id join
        events e on c.eventId = e.id
)
select
    fightId,
    startTime,
    redId as fighterId,
    blueId as opponentId,
    methodId
from eventFights
union all
select
    fightId,
    startTime,
    blueId as fighterId,
    redId as opponentId,
    methodId
from eventFights;
