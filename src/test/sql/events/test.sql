select
    id,
    json_object('name', name, 'startTime', startTime) as nest,
    json_array(name, startTime) as arr
from events limit 5;
