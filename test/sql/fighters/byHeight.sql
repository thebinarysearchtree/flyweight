select 
    name, 
    heightCm, 
    row_number() over (order by heightCm desc) as heightRank 
from fighters 
where hometown like '%Las Vegas%' 
order by name;
