select
    f.name,
    groupArray(o.name) as otherNames
from
    fighters f left join
    otherNames o on o.fighterId = f.id
group by f.id
limit 5
