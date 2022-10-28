select
    l.name as location,
    f.name as fighter,
    f.wins
from
    locations l join
    (
        select
            f.id,
            f.name,
            e.locationId,
            count(*) as wins,
            row_number() over (partition by e.locationId order by count(*) desc) as rowNumber
        from
            fights ft join
            cards c on ft.cardId = c.id join
            events e on c.eventId = e.id join
            fighters f on ft.winnerId = f.id
        group by e.locationId, f.id
    ) f on f.locationId = l.id
where 
    f.rowNumber = 1 and 
    wins > 3
order by wins desc
        