# HKK2025 Backend

## Dependencies
    "@types/bcrypt": "^5.0.2",
    "@types/cookie-parser": "^1.4.8",
    "@types/cors": "^2.8.18",
    "@types/express": "^5.0.2",
    "@types/jsonwebtoken": "^9.0.9",
    "@types/node": "^22.15.21",
    "nodemon": "^3.1.10",
    "ts-node": "^10.9.2",
    "typescript": "^5.8.3"

## Project Structure

### Controllers
    Logic between routes and queries
### Routes
    Defines API routes and connects them to controllers
### Db
    Handles database connection and SQL execution logic
### Queries
    Contains SQL logic, separated by resource/module

## Environment Variables
    Environment variables are stored in the .env file:

    Database
        DB_HOST = 
        DB_PORT = 
        DB_USER = 
        DB_PASSWORD = 
        DB_NAME = 

    Server
        APP_HOST = 
        APP_PORT = 

    Frontend
        FRONTEND_ORIGIN = 

    JSON Web Token (JWT)
        JWT_SECRET = 

    Cookie
        NODE_ENV = 


New Tables

-- Create Permissions table
CREATE TABLE public.permissions (
    "permission_id" SERIAL PRIMARY KEY,
    "permission_name" VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'client_edit', 'client_delete'
    "description" TEXT
);

-- Create Role_Permissions junction table
CREATE TABLE public.role_permissions (
    "rooli_id" INT NOT NULL,
    "permission_id" INT NOT NULL,
    PRIMARY KEY ("rooli_id", "permission_id"),
    FOREIGN KEY ("rooli_id") REFERENCES public.roolit("rooli_id") ON DELETE CASCADE,
    FOREIGN KEY ("permission_id") REFERENCES public.permissions("permission_id") ON DELETE CASCADE
);


Shean -
-- Add columns to the 'kalusto' table to store the last known location of a vehicle

COMMENT ON COLUMN public.kalusto.viim_sijainti_lat IS 'Last known latitude of the vehicle.';
COMMENT ON COLUMN public.kalusto.viim_sijainti_long IS 'Last known longitude of the vehicle.';
COMMENT ON COLUMN public.kalusto.viim_sijainti_aika IS 'Timestamp of the last location update.';

Remove NOT NULL on Puulaani Table
ALTER TABLE public.puulaani ALTER COLUMN auto_nro DROP NOT NULL;
ALTER TABLE public.puulaani ALTER COLUMN lisatiedot DROP NOT NULL;

puulaani table Add marker_style Row for Marker Style
ALTER TABLE public.puulaani ADD COLUMN marker_style VARCHAR(50) DEFAULT 'default';

Remove the NOT NULL constraint on lisatieto 
ALTER TABLE public.muutieto ALTER COLUMN lisatieto DROP NOT NULL;

Purkkupaikka Visibility on map, states save on db 
ALTER TABLE public.purkupaikka
ADD COLUMN is_visible_on_map BOOLEAN DEFAULT TRUE NOT NULL;

For Soft Delete 
COMMENT ON COLUMN public.purkupaikka.is_active IS 'Indicates if the unloading site is active (true) or soft-deleted (false).';
ALTER TABLE public.unloading_sites
ADD COLUMN is_active BOOLEAN DEFAULT TRUE NOT NULL;

For Soft Delete On Loads
ALTER TABLE public.kuorma
ADD COLUMN is_active BOOLEAN DEFAULT TRUE NOT NULL;

09-03-2025

For identyfi the current situation of vehicle 
-- COMMENT ON COLUMN public.kuorma.status IS 'The current status of the load (e.g., Assigned, In Progress, At Origin, Loaded, En Route to Destination, Completed).'; --

-- Add a new 'status' column to the 'kuorma' table
ALTER TABLE public.kuorma
ADD COLUMN status VARCHAR(50) DEFAULT 'Assigned' NOT NULL;

permission Assign for the  "Kuljettaja" 
1-
Find the "Kuljettaja" Role ID
SELECT rooli_id FROM public.roolit WHERE roolin_nimi = 'Kuljettaja';

2-
Check Permission ID's 
SELECT permission_id, permission_name FROM public.permissions 
WHERE permission_name IN ('client_view', 'vehicle_view', 'driver_view');

3-
Connected  permissions with  "Kuljettaja" role
-- Assign 'client_view' (ID 1) to 'Kuljettaja' role (ID 5)
INSERT INTO public.role_permissions (rooli_id, permission_id) VALUES (5, 1);

-- Assign 'vehicle_view' (ID 5) to 'Kuljettaja' role (ID 5)
INSERT INTO public.role_permissions (rooli_id, permission_id) VALUES (5, 5);

-- Assign 'driver_view' (ID 9) to 'Kuljettaja' role (ID 5)
INSERT INTO public.role_permissions (rooli_id, permission_id) VALUES (5, 9);

Add load_view permission

1-
INSERT INTO public.permissions (permission_name, description) 
VALUES ('load_view', 'Can view the details of assigned loads');

2- Find IDs
--Find "Kuljettaja" role  ID  (5 )
SELECT rooli_id FROM public.roolit WHERE roolin_nimi = 'Kuljettaja';

-- 'load_view' permission  (ID 29 )
SELECT permission_id FROM public.permissions WHERE permission_name = 'load_view';

3-Add Records for role_permissions Table  :
- Assign 'load_view' (ID 29) to 'Kuljettaja' role (ID 5)
INSERT INTO public.role_permissions (rooli_id, permission_id) VALUES (5, 29) ON CONFLICT DO NOTHING;

-- Assign 'load_view' to other office roles as well for consistency
-- (Assuming Toimisto ID is 3, Admin is 2, Superuser is 1)
INSERT INTO public.role_permissions (rooli_id, permission_id) VALUES (3, 29) ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (rooli_id, permission_id) VALUES (2, 29) ON CONFLICT DO NOTHING;
INSERT INTO public.role_permissions (rooli_id, permission_id) VALUES (1, 29) ON CONFLICT DO NOTHING;
