select
    f.id,
    f.winnerId,
    w.name as winnerName
from
    fights f join
    fighters w on f.winnerId = w.id
limit 5;
