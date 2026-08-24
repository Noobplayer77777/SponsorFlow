# SponsorFlow Database Architecture

This document describes the core models and their relationships in the SponsorFlow CRM, built with PostgreSQL and Prisma ORM.

## Core Models

### 1. User
Represents a team member (Finance Lead or Member).
- **id**: Primary Key (UUID).
- **name, email**: Basic identification.
- **googleId**: Used for upcoming OAuth integration (nullable for now).
- **role**: `ADMIN` or `MEMBER`.
- **Relationships**:
  - A User can have many **Assignments** (Companies they own).
  - A User can send many **Emails**.

### 2. Company
Represents a sponsor/company being targeted for outreach.
- **id**: Primary Key (UUID).
- **companyName**: Name of the company.
- **contactPerson, designation, email, website, industry, linkedin, phoneNumber, location**: Metadata for the outreach process.
- **status**: Represents their position in the outreach funnel (e.g., `NOT_ASSIGNED`, `ASSIGNED`, `EMAIL_DRAFTED`, `CONFIRMED`).
- **Relationships**:
  - A Company has exactly **one optional Assignment** (ensuring a 1-to-1 ownership model to prevent duplicate outreach by multiple members).
  - A Company can have many **Emails** sent to them.

### 3. Assignment
Tracks which User is currently responsible for reaching out to which Company.
- **id**: Primary Key (UUID).
- **companyId**: `@unique` constraint. This acts as a strict guardrail: a company can only exist in the Assignment table once, mathematically preventing multiple members from claiming the same company simultaneously (preventing duplicate outreach).
- **userId**: The member responsible.
- **assignedAt**: Timestamp.

### 4. EmailTemplate
Pre-defined templates for outreach.
- **id**: Primary Key (UUID).
- **name, subject, body**: Content of the email.
- **createdBy**: Author of the template.

### 5. Email
Tracks individual emails sent to a company.
- **id**: Primary Key (UUID).
- **subject, body, recipient**: Email content details.
- **status**: `DRAFT`, `SENT`, or `FAILED`.
- **companyId**: The company receiving the email.
- **senderId**: The user who sent the email.

## Duplicate Outreach Prevention
The primary mechanism preventing duplicate outreach is the **1-to-1 relationship** enforced on the `Assignment` model. Because `companyId` is marked as `@unique` on the `Assignment` table, attempting to assign a second owner to a company will physically fail at the database level.
