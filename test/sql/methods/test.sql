select 
    object(m.*) as methods,
    c.card
from 
    (select id, object(*) as card from cards) c join
    fights f on f.cardId = c.id join 
    methods m on f.methodId = m.id
group by c.id
limit 5;
