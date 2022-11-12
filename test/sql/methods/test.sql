select 
    object(m.*) as method 
from 
    fights f join 
    methods m on f.methodId = m.id
where f.methodId is not null
limit 5
