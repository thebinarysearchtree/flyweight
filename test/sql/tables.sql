create table weightClasses (
    id integer primary key,
    name text not null,
    weightLbs integer not null,
    gender text not null check (gender in ('m', 'f'))
);

create table locations (
    id integer primary key,
    name text not null,
    address text not null,
    lat real not null,
    long real not null
);

create table events (
    id integer primary key,
    name text not null,
    startTime date not null,
    locationId integer references locations on delete cascade
);

create index eventsStartTimeIndex on events(startTime);

create table cards (
    id integer primary key,
    eventId integer not null references events on delete cascade,
    cardName text not null,
    cardOrder integer not null,
    startTime date
);

create index cardsEventIdIndex on cards(eventId);

create table coaches (
    id integer primary key,
    name text not null,
    city text not null,
    profile json
);

create table fighters (
    id integer primary key,
    name text not null,
    nickname text,
    born text,
    heightCm integer,
    reachCm integer,
    hometown text not null,
    social json,
    isActive boolean not null,
    phone json,
    documents json
);

create index fightersIsActiveIndex on fighters(isActive);

create table otherNames (
    id integer primary key,
    fighterId integer not null references fighters on delete cascade,
    name text not null
);

create table fighterCoaches (
    id integer primary key,
    coachId integer not null references coaches on delete cascade,
    fighterId integer not null references fighters on delete cascade,
    startDate text not null,
    endDate text,
    unique(fighterId, coachId)
);

create table rankings (
    id integer primary key,
    fighterId integer not null references fighters on delete cascade,
    weightClassId integer not null references weightClasses on delete cascade,
    rank integer not null,
    isInterim boolean not null
);

create index rankingsRankIndex on rankings(rank) where rank = 0;

create table methods (
    id integer primary key,
    name text not null,
    abbreviation text not null
);

create table fights (
    id integer primary key,
    cardId integer not null references cards on delete cascade,
    fightOrder integer not null,
    blueId integer not null references fighters on delete cascade,
    redId integer not null references fighters on delete cascade,
    winnerId integer references fighters on delete cascade,
    methodId integer references methods on delete cascade,
    methodDescription text,
    endRound integer,
    endSeconds integer,
    titleFight boolean not null,
    isInterim boolean not null,
    weightClassId integer references weightClasses on delete cascade,
    oddsBlue integer,
    oddsRed integer,
    catchweightLbs real
);

create index fightsEventCardIdIndex on fights(cardId);
create index fightsBlueIdIndex on fights(blueId);
create index fightsRedIdIndex on fights(redId);

create table cancelledFights (
    id integer primary key,
    cardId integer not null references cards on delete cascade,
    cardOrder integer not null,
    blueId integer not null references fighters on delete cascade,
    redId integer not null references fighters on delete cascade,
    cancelledAt date not null,
    cancellationReason text
);

create index cancelledFightsCardIdIndex on cancelledFights(cardId);

create table titleRemovals (
    id integer primary key,
    fighterId integer not null references fighters on delete cascade,
    weightClassId integer not null references weightClasses on delete cascade,
    isInterim boolean not null,
    removedAt date not null,
    reason text not null
);

create index titleRemovalsFighterIdIndex on titleRemovals(fighterId);

create virtual table fighterProfiles using fts5(
    name, 
    hometown, 
    content=fighters, 
    content_rowid=id
);

create trigger fighters_ai after insert on fighters begin
    insert into fighterProfiles(rowid, name, hometown) values (new.rowid, new.name. new.hometown);
end;

create trigger fighters_ad after delete on fighters begin
    insert into fighterProfiles(fighterProfiles, rowid, name, hometown) values ('delete', old.rowid, old.name, old.hometown);
end;

create trigger fighters_au after update on fighters begin
    insert into fighterProfiles(fighterProfiles, rowid, name, hometown) values ('delete', old.rowid, old.name, old.hometown);
    insert into fighterProfiles(rowid, name, hometown) values (new.rowid, new.name, new.hometown);
end;
