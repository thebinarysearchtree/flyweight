select 
    row_number() over (order by id) - row_number() over (order by name) as result
from events 
limit 4;
