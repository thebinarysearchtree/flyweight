select 

id,

name,
json_group_array(  json_object  ('id',   id,   
'name',
name
)) as test
from     events

limit    2;
