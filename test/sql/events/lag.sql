select 
    lag(locationId + 1) over win as test1,
    lag(locationId + 1, 1) over win as test2,
    first_value((locationId + 1) * 2) over win as test3
from events
window win as (order by locationId);
