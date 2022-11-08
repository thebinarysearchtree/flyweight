select social ->> 'instagram' as instagram 
from fighters 
where social is not null 
limit 5
