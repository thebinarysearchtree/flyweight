select 
    f.methodDescription
from 
    fights f join
    methods m on f.methodId = m.id
where f.methodId = 2
group by f.methodDescription
order by count(*) desc
limit 1
