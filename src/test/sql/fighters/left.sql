select
    f.id,
    f.winnerId,
    w.name as winnerName
from
    fights f left join
    fighters w on f.winnerId = w.id
where f.winnerId is null
limit 5;
