# Stock Management

## Tech Stack

- **Framework**: React Router (Framework Mode)
- **Styling**: Tailwind CSS
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Build Tool**: Vite
- **Validation**: Zod
- **UI Components**: shadcn/ui

## How to Run Locally

### Prerequisites

- Node.js (version 20 or higher)
- Neon PostgreSQL database

### Setup

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd stock-management
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add your Neon database URL:

   ```
   DATABASE_URL=postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require
   ```

4. Run database migrations:

   ```bash
   npm run db:migrate
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:5173`
