select
    id,
    object(name, startTime) as nest
from events limit 5;
