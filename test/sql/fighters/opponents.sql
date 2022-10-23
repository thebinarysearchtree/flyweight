select
    o.opponentId,
    f.name
from
    opponents o join
    fighters f on o.opponentId = f.id
where
    o.fighterId = 17
