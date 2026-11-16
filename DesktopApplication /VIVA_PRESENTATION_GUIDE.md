# Viva Presentation Guide

## Q1: What application did you build, and how does it work?

**Answer:** I built Startup-AYUSH Desktop, a standalone desktop management application for AYUSH stakeholders. Electron provides the desktop window, React provides the interface, and localStorage provides demonstration persistence. The application supports authentication, stakeholder management, events and registrations, a resource library, community discussions, profile management and settings.

I selected a desktop application because an Electron window demonstrates native app packaging and a macOS-style workspace, while remaining easier to demonstrate than a distributed deployment. It separates Electron architecture from the original web project and avoids changing the backend or database.

**Complete workflow:** Sign in with `user@startupayush.demo` / `Demo@123`, open Dashboard, open Events, choose an available event, select Register and show the confirmation and updated registration count.

## Q2: How have you structured and organized my application?

**Answer:** JavaScript is used throughout. Vite builds React, Electron owns the desktop process, the preload script exposes only a version API, and React renders the application.

- `electron/main.js`: desktop window and secure configuration
- `electron/preload.js`: context-isolated preload API
- `src/App.jsx`: shell and navigation
- `src/context/AppContext.jsx`: state, session and local persistence
- `src/services/businessLogic.js`: reusable event and validation logic
- `src/pages/`: Dashboard and seven feature workflows
- `src/components/UI.jsx`: modal, confirmation and notification components
- `src/data/demoData.js`: initial records
- `src/styles/app.css`: shared visual design

This keeps UI components separate from business rules and persistence utilities.

## Q3: How does your application handle user interactions and application state?

**Answer:** React `useState` holds form, modal and navigation state. `AppContext` holds the current user and application collections. Buttons call event handlers that validate input, update context state and invoke notification functions. Changes are written to localStorage through a small storage utility. The event-registration flow is the clearest example: the register button calls `registerEvent`, which calls a service function, updates the event collection and immediately updates the event row and dashboard.

## Q4: How did I implement and test the core functionality?

**Answer:** Event registration is implemented in `src/services/businessLogic.js`. `registerForEvent` first confirms that the event exists, then rejects duplicate registration and checks the capacity before adding the user ID. `cancelRegistration` removes only that user. React updates the shared event collection and storage, so counts and dashboard values update immediately.

The focused Node tests verify duplicate registration, full-event rejection and cancellation. Run `npm test` before a viva. Automated UI testing was not added to avoid unnecessary framework complexity.

## Q5: What challenges did I face, and how complete and stable is my application?

**Answer:** The main engineering decisions were keeping Electron APIs restricted through preload, preserving data without a backend, and keeping event counts consistent across multiple screens. The implementation is complete as a standalone demonstration: login, CRUD workflows, registration rules, community interactions, persistence and reset confirmation are functional.

Limitations: authentication is local and demo-only, passwords are not encrypted or production-secured, external resource links depend on network availability, and UI data is not synchronized with the original backend. The application is stable for a viva workflow but would require server-side authentication, authorization, database migrations and API testing before production use.
