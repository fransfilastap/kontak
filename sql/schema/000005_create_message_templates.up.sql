-- alter table users first to fix the user_id data type
alter table clients
    alter column user_id type int using user_id::integer;

-- add foreign key
alter table clients
add constraint fk_client_user foreign key (user_id) references users(id);

-- Create message templates table
CREATE TABLE message_templates
(
    id         UUID                     DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    integer REFERENCES users (id) ON DELETE CASCADE,
    name       VARCHAR(255) NOT NULL,
    content    TEXT         NOT NULL,
    variables  JSONB                    DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);