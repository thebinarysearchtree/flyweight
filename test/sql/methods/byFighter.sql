select m.name as method, count(*) as count
from 
    fights f join
    methods m on f.methodId = m.id
where f.winnerId = $fighterId
group by m.id
