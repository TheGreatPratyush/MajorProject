# 7-9 Minute Viva Recording Checklist

## 0:00-0:45 - Application overview

1. Open the Electron window at a 1280x820 size.
2. Show the login screen and demo account box.
3. Speak: "This is Startup-AYUSH Desktop, a standalone demonstration for managing AYUSH stakeholders and activities."

## 0:45-1:30 - Login and dashboard

1. Click the Stakeholder demo account or enter `user@startupayush.demo` / `Demo@123`.
2. Click Sign in.
3. Show Dashboard summary cards and navigate to Stakeholders.
4. Speak: "Login updates shared React state and localStorage. The dashboard reads live collections rather than fixed totals."

## 1:30-2:30 - Stakeholder workflow

1. Click Add stakeholder.
2. Enter a short new organization name, choose a category, email and location.
3. Save and show the new card.
4. Open and edit one card briefly.
5. Speak: "Reusable forms and validation handle create and edit operations."

## 2:30-5:00 - Main event-registration workflow

1. Open Events.
2. Choose `Herbal Research Pitch Clinic`, a currently unregistered event.
3. Speak: "The registration button calls a shared business-logic function."
4. Open the source file `src/services/businessLogic.js` in the editor and highlight `registerForEvent`.
5. Explain duplicate and capacity checks.
6. Return to the app and click Register.
7. Show the Registered status and count change.
8. Click Cancel and show the count return.
9. Register once more for the final confirmation.
10. Navigate to Dashboard and show the live event information.

## 5:00-6:15 - Resources and community

1. Open Resources.
2. Add or open a resource and identify it as sample data.
3. Open Community.
4. Create a short post and add a comment.
5. Speak: "All collections use the same context and localStorage persistence."

## 6:15-7:15 - Structure and security

1. Open `src/context/AppContext.jsx`.
2. Open `src/utils/storage.js`.
3. Open `electron/main.js` and `electron/preload.js`.
4. Explain context isolation and the restricted preload API.
5. Speak: "Node integration remains disabled and renderer content has no unrestricted Node access."

## 7:15-7:50 - Settings and testing

1. Open Settings.
2. Show demo mode information.
3. Open `src/services/businessLogic.test.js`.
4. Run `npm test` in the terminal and show the passing output.
5. Do not reset demo data during the recording unless this is the last action.

## 7:50-8:30 - Optional reset and closing

1. Open Settings and choose Reset demo data.
2. Cancel or confirm only as planned, showing the confirmation.
3. Close with the limitations: local demo authentication and data, no original backend synchronization.
