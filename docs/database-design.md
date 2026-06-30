# Database Design

## ER Diagram

![Node by Node database ER diagram](./node-by-node_db.png)

## Main Relationships

- Organization has many users.
- User has many sessions.
- User has many conversations.
- Conversation has many messages.
- User and role have a many-to-many relationship through `UserRole`.
- Role and permission have a many-to-many relationship through `RolePermission`.
