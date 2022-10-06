create view opponents as
select
    redId as fighterId,
    blueId as opponentId
from fights
union all
select
    blueId as fighterId,
    redId as opponentId
from fights;
