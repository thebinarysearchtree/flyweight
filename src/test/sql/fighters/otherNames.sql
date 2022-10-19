select
    f.name,
    json_group_array(o.name) as otherNames
from
    fighters f left join
    otherNames o on o.fighterId = f.id
group by f.id
