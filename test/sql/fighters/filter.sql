select 
    name, 
    group_concat(reachCm, ', ') 
        filter (where heightCm > 180) 
        over (order by born) as reaches
from fighters 
limit 2;
