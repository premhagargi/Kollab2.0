
# Kollab - Task Management Platform

Kollab is a Trello-like task management platform designed for remote teams, built with a modern web stack including Firebase, Next.js, and Genkit for AI-powered features.

## Features

*   **Real-time Collaboration:** (Future goal, current focus on single-user task management)
*   **Kanban Workflows:** Organize tasks visually with customizable columns within different workflows (e.g., for client projects, content calendars, personal goals).
    *   Inline column creation and renaming.
*   **Task Management:** Create, update, and manage tasks with details like:
    *   Client Name
    *   Billable status (toggle)
    *   Deliverables list
    *   Descriptions, priority, due dates, subtasks, and comments.
*   **Task Cards on Workflow:**
    *   Visual priority indicators.
    *   Quick task completion via a subtle checkbox (appears on hover for incomplete, always visible for completed).
    *   Drag & Drop tasks between columns and reorder them.
*   **Task Archiving:** Archive tasks to declutter your workflow.
*   **User Authentication:** Secure sign-up and login using Firebase Authentication (Google Sign-In & Email/Password).
*   **Firestore Integration:** All user data, workflows, and tasks are stored and managed in Cloud Firestore.
*   **AI-Powered Clarity Tools (via Genkit):**
    *   **Client Update Drafts:** Get quick AI-generated summaries of task progress suitable for client updates. Users can specify date ranges and provide additional context.
    *   **Break Down Task:** Let AI suggest potential subtasks or next steps to clarify task scope.
*   **Workflow Sharing:** (Simplified) Button to "Share" workflow, with a modal indicating future client preview link functionality and providing the current URL.
*   **Solo Work Insights (Analytics):** A dashboard to visualize your task completion rates, work velocity, and task distribution (mock data for now).
*   **Workflow Templates:** Create new workflows from predefined templates like "Blank", "Freelance Project", or "Content Creation" to quickly set up common column structures.
*   **Responsive Design:** Works across different screen sizes.
*   **Black & White UI Theme:** A clean, focused, and minimalist black and white interface.

## Tech Stack

*   **Frontend:**
    *   Next.js (App Router)
    *   React
    *   TypeScript
    *   ShadCN UI Components
    *   Tailwind CSS
*   **Backend & Database:**
    *   Firebase Authentication
    *   Cloud Firestore (NoSQL Database)
    *   Next.js Server Actions
*   **AI Integration:**
    *   Genkit (with Google AI models like Gemini)
*   **Email Notifications:**
    *   Nodemailer (currently for team invites, may be repurposed or deprecated)
*   **Styling:**
    *   Tailwind CSS
    *   CSS Variables for theming (via `src/app/globals.css`)
*   **Deployment:**
    *   Configured for Firebase App Hosting (see `apphosting.yaml`)

## Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn
*   A Firebase project

### Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd kollab
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Firebase Configuration:**
    *   Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/).
    *   Enable **Firebase Authentication** (with Google Sign-In and Email/Password methods).
    *   Enable **Cloud Firestore** in your Firebase project.
    *   Obtain your Firebase project configuration settings (apiKey, authDomain, etc.).
    *   **Security Rules:** Update your Cloud Firestore security rules. Use the rules provided below:
        ```javascript
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /users/{userId} {
              allow read, write: if request.auth != null && request.auth.uid == userId;
            }
            // Collection name is 'boards' in Firestore, but represents 'workflows' in UI
            match /boards/{workflowId} {
              allow read, update, delete: if request.auth != null && resource.data.ownerId == request.auth.uid;
              allow create: if request.auth != null && request.resource.data.ownerId == request.auth.uid;
            }
            match /tasks/{taskId} {
              // Rules for single document operations (get, update, delete)
              // User must be authenticated and own the task (via denormalized ownerId on the task)
              allow get, update, delete: if request.auth != null && resource.data.ownerId == request.auth.uid;

              // Rule for creating tasks
              // User must be authenticated, the new task's ownerId must be the user's UID,
              // and the parent workflow must also be owned by the user.
              allow create: if request.auth != null
                            && request.resource.data.ownerId == request.auth.uid
                            && get(/databases/$(database)/documents/boards/$(request.resource.data.workflowId)).data.ownerId == request.auth.uid;

              // Rule for listing/querying tasks
              // Allows listing if the user is authenticated.
              // The actual security relies on the client-side query including a 'where("ownerId", "==", request.auth.uid)' clause.
              allow list: if request.auth != null;
            }
          }
        }
        ```
        Publish these rules in your Firebase Console (Firestore Database > Rules).

4.  **Environment Variables:**
    *   Create a `.env.local` file in the root of your project (copy `.env` if it exists, or create it from scratch).
    *   Add your Firebase project configuration:
        ```env
        NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
        NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
        NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
        NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id # Optional

        # For Genkit/Google AI
        GOOGLE_API_KEY=your_google_ai_api_key # or GENAI_API_KEY

        # For Email Notifications (Nodemailer) - Fill these based on your email provider
        # This is less critical for the freelancer pivot but kept for potential future use.
        EMAIL_HOST=
        EMAIL_PORT=
        EMAIL_USER=
        EMAIL_PASS=
        EMAIL_FROM=
        ```
    *   **Important:** Replace `your_...` placeholders with your actual Firebase and Google AI credentials.
    *   For `EMAIL_*` variables, use the SMTP details from your email provider.

## Available Scripts

*   **`npm run dev`**: Starts the Next.js development server (usually on `http://localhost:9002`).
*   **`npm run genkit:dev`**: Starts the Genkit development server for AI flows.
*   **`npm run genkit:watch`**: Starts Genkit with file watching.
*   **`npm run build`**: Builds the application for production.
*   **`npm run start`**: Starts a Next.js production server (after building).
*   **`npm run lint`**: Runs ESLint.
*   **`npm run typecheck`**: Runs TypeScript type checking.

## Project Structure

*   **`src/app/`**: Next.js App Router pages.
*   **`src/components/`**: React components (UI, layout, feature-specific).
*   **`src/contexts/`**: React context providers (e.g., `AuthContext`).
*   **`src/hooks/`**: Custom React hooks.
*   **`src/lib/`**: Utility functions, Firebase initialization, Nodemailer setup.
*   **`src/services/`**: Firestore interaction logic (e.g., `workflowService.ts`, `taskService.ts`).
*   **`src/actions/`**: Next.js Server Actions (e.g., for AI, email sending).
*   **`src/ai/`**: Genkit related files (flows, prompts).
*   **`src/types/`**: TypeScript type definitions.
*   **`public/`**: Static assets.

## Contributing

(Add contribution guidelines if this project becomes collaborative)

## License

(Specify a license if applicable, e.g., MIT)
