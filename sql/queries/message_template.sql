-- name: GetUserTemplates :many
SELECT *
FROM message_templates
where user_id = $1
order by created_at desc;

-- name: CreateNewMessageTemplate :one
insert into message_templates (user_id, name, content, variables)
values ($1, $2, $3, $4)
returning *;

-- name: UpdateMessageTemplate :one
update message_templates
set name      = $1,
    content   = $2,
    variables = $3
where id = $4
  and user_id = $5
returning *;

-- name: DeleteMessageTemplate :exec
delete
from message_templates
where id = $1
  and user_id = $2;

-- name: GetMessageTemplateByID :one
SELECT *
FROM message_templates
WHERE id = $1;
