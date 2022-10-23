select
    id,
    json_object('name', name, 'startTime', startTime) as nest
from events limit 5;
