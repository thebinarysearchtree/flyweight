with weights as (
    select o.fighterId, f.weightClassId, w.name
    from
        opponents o join
        fights f on o.fightId = f.id join
        weightClasses w on f.weightClassId = w.id
    group by
        o.fighterId, f.weightClassId
),
weightsObjects as (
    select 
        fighterId, 
        json_group_array(
            json_object(
                'id', weightClassId, 
                'name', name,
                'test', true
            )) as weightClasses
    from weights
    group by fighterId
)
select f.name, w.weightClasses
from fighters f join weightsObjects w on w.fighterId = f.id
where f.id = $fighterId
