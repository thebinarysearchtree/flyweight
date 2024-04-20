select 
    name, 
    heightCm, 
    reachCm, 
    groupArray(reachCm) over (partition by heightCm) as reaches
from fighters 
where hometown like '%new york%';
